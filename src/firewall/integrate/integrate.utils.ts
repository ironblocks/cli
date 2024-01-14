// Builtin.
import { exec, spawn } from 'child_process';
import { stat, readdir, readFile, writeFile } from 'fs/promises';
import { join, parse } from 'path';
import { promisify } from 'util';
// 3rd party.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InquirerService } from 'nest-commander';
import { parse as parseSolidity } from '@solidity-parser/parser';
import { ethers } from 'ethers';
import { any as pathMatch } from 'micromatch';
import { intersects } from 'semver';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { UnsupportedFileFormatError } from './errors/unsupported.file.format.error';
import { UnsupportedParamTypeError } from './errors/unsupported.param.type.error';
import { UnsupportedSolidityVersionError } from './errors/unsupported.solidity.version.error';

const execAsync = promisify(exec);

const FW_IMPORT_PATH = '@ironblocks/firewall-consumer/contracts/FirewallConsumer.sol';
const FW_IMPORT = `import "${FW_IMPORT_PATH}";`;
const FW_BASE_CONTRACT = 'FirewallConsumer';
const FW_PROTECTED_MODIFIER = 'firewallProtected';
const FW_PROTECTED_CUSTOM_MODIFIER = 'firewallProtectedCustom';
const FW_PROTECTED_SIG_MODIFIER = 'firewallProtectedSig';
const FW_INVARIANT_PROTECTED_MODIFIER = 'invariantProtected';

const FIREWALL_MODIFIERS = [
    FW_PROTECTED_MODIFIER,
    FW_PROTECTED_CUSTOM_MODIFIER,
    FW_PROTECTED_SIG_MODIFIER,
    FW_INVARIANT_PROTECTED_MODIFIER,
] as const;

export type FirewallModifier = (typeof FIREWALL_MODIFIERS)[number];

export interface IntegrateOptions {
    verbose?: boolean;
    external?: boolean;
    internal?: boolean;
    modifiers?: FirewallModifier[];
}

export const SUPPORTED_SOLIDITY_VERSIONS = '>= 0.8 < 0.8.20';

const RE_SOLIDITY_FILE_NAME = new RegExp(`\\w+\\.sol$`, 'g');

const RE_COMMENTS = new RegExp(`(?:\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)`, 'g');
const RE_BLANK_SPACE = new RegExp(`(?:(?:\\s)|${RE_COMMENTS.source})`, 'g');

const RE_INDENTATION = new RegExp(`(?<indentation>[\\r\\s\\n]+)`, 'g');

/**
 * Gradually composing a regex to match the following pattern:
 *
 * contract <name> (is X, Y, Z)
 */
const RE_NAME = new RegExp(`\\w+`, 'g');
const RE_CONTRACT_DECLARATION = new RegExp(
    `(?<declaration>(?:abstract${RE_BLANK_SPACE.source}+)?contract${RE_BLANK_SPACE.source}+(?<name>${RE_NAME.source}))`,
    'g',
);
const RE_BASE_CONTRACTS = new RegExp(
    `(?<baseContracts>(?:${RE_BLANK_SPACE.source}*[\\w,]+)+)`,
    'g',
);
const RE_INHERITANCE = new RegExp(
    `(?<inheritance>${RE_BLANK_SPACE.source}+is${RE_BLANK_SPACE.source}+${RE_BASE_CONTRACTS.source})`,
    'g',
);
const RE_CONTRACT_DEFINITION = new RegExp(
    `^${RE_CONTRACT_DECLARATION.source}${RE_INHERITANCE.source}?`,
    'g',
);

/**
 * Gradually composing a regex to match the following pattern:
 *
 * (function)? <signature>(<name>(...params)) <visibility>? <modifiers>? (returns (...params)?)?
 */
const RE_FUNCTION = new RegExp(`(?<func>function)`, 'g');
const RE_PARAMS = new RegExp(
    `(?<params>${RE_BLANK_SPACE.source}*[\\w,\\[\\]]+(?:${RE_BLANK_SPACE.source}*))*`,
    'g',
);
const RE_ARGS = new RegExp(
    `(?:${RE_BLANK_SPACE.source}*[\\w,\\.\\(\\)\\[\\]]+(?:${RE_BLANK_SPACE.source}*))*`,
    'g',
);
const RE_SIGNATURE = new RegExp(
    `(?<signature>${RE_BLANK_SPACE.source}+(?<name>${RE_NAME.source})${RE_BLANK_SPACE.source}*\\(${RE_PARAMS.source}\\))`,
    'g',
);
const RE_VISIBILITY = new RegExp(
    `(?<visibility>${RE_BLANK_SPACE.source}*(?:public|external|internal|private))`,
    'g',
);
const RE_MODIFIERS = new RegExp(
    `(?<modifiers>(?:${RE_BLANK_SPACE.source}*(?!returns)[\\w,\\.\\(\\)\\[\\]]+)*)`,
    'g',
);
const RE_IMMUTABLE_STATE = new RegExp(`\\pure|view\\b`, 'i');
const RE_RETURNS = new RegExp(`(?<returns>${RE_BLANK_SPACE.source}*returns[^{]+)`, 'g');
const RE_METHOD_DEFINITION = new RegExp(
    `^${RE_FUNCTION.source}?${RE_SIGNATURE.source}${RE_VISIBILITY.source}?${RE_MODIFIERS.source}?${RE_RETURNS.source}?`,
    'g',
);

/**
 * Gradually composing a regex to match the following pattern:
 *
 * <firewallModifier>(...params)(\s\r\n)?
 */
const RE_FW_MODIFIER_NO_ARGS = new RegExp(
    `(?:${FIREWALL_MODIFIERS.map((mod) => `\\b${mod}\\b`).join('|')})`,
    'g',
);
const RE_FW_MODIFIER_WITH_ARGS = new RegExp(
    `${RE_FW_MODIFIER_NO_ARGS.source}(?:${RE_BLANK_SPACE.source}*\\(${RE_ARGS.source}\\))?`,
    'g',
);
const RE_FW_MODIFIER = new RegExp(
    `${RE_BLANK_SPACE.source}*${RE_FW_MODIFIER_WITH_ARGS.source}(?:${RE_BLANK_SPACE.source}*)?`,
    'g',
);

type ParsedSolidityConstructs = {
    children: SolidityConstruct[];
    errors: unknown[];
    range: [number, number];
};

type SolidityConstruct = {
    type: string;
    range: [number, number];
    subNodes?: SolidityConstruct[];

    kind?: string;
    name?: string;
    path?: string;
    value?: string;
    baseContracts?: SolidityConstruct[];
    baseName?: SolidityConstruct;
    namePath?: string;
    visibility?: string;
    isConstructor?: boolean;
    body?: SolidityConstruct;
    modifiers?: SolidityConstruct[];
    parameters?: SolidityConstruct[];
    typeName?: SolidityConstruct;
    baseTypeName?: SolidityConstruct;
    length?: {
        type?: string;
        number?: string;
    };
};

@Injectable()
export class FirewallIntegrateUtils {
    private serializerByModifier: Partial<
        Record<FirewallModifier, (contract: SolidityConstruct, method: SolidityConstruct) => string>
    >;

    constructor(
        private readonly inquirer: InquirerService,
        private readonly config: ConfigService,
        private readonly logger: Logger,
    ) {
        this.serializerByModifier = {
            [FW_PROTECTED_MODIFIER]: () => FW_PROTECTED_MODIFIER,
            [FW_PROTECTED_SIG_MODIFIER]: (
                contract: SolidityConstruct,
                method: SolidityConstruct,
            ) => {
                const sigHash = this.calcSighash(contract, method);
                return `${FW_PROTECTED_SIG_MODIFIER}(bytes4(${sigHash}))`;
            },
            [FW_INVARIANT_PROTECTED_MODIFIER]: () => FW_INVARIANT_PROTECTED_MODIFIER,
        };
    }

    async assertFileExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isFile()) {
                throw new Error();
            }
        } catch (err) {
            throw new Error(`file does not exist '${path}'`);
        }
    }

    async assertDirExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isDirectory()) {
                throw new Error();
            }
        } catch (err) {
            throw new Error(`directory does not exist '${path}'`);
        }
    }

    assertSolidityFile(path: string): void {
        if (!this.isSolidityFile(path)) {
            throw new Error(`not a solidity file '${path}'`);
        }
    }

    isSolidityFile(path: string): boolean {
        return !!path.match(RE_SOLIDITY_FILE_NAME);
    }

    async forEachSolidityFilesInDir(
        cb: (filepath: string) => unknown | Promise<unknown>,
        dirpath: string,
        recursive: boolean,
    ): Promise<void> {
        const directoriesQueue: string[] = [dirpath];
        while (directoriesQueue.length) {
            const dir = directoriesQueue.pop();
            const files = await readdir(dir);
            for (const filename of files) {
                const path = join(dir, filename);
                const stats = await stat(path);
                if (this.shouldIgnore(path)) {
                    continue;
                }
                if (stats.isFile() && this.isSolidityFile(path)) {
                    await cb(path);
                }
                if (stats.isDirectory() && recursive) {
                    directoriesQueue.push(path);
                }
            }
        }
    }

    private shouldIgnore(path: string): boolean {
        const allowList = this.config.get<string[]>('fw.integ.include') || [];
        const ignoreList = this.config.get<string[]>('fw.integ.exclude') || [];
        const matchedAllowList = pathMatch(path, allowList);
        const matchedIgnoreList = pathMatch(path, ignoreList);
        if (allowList.length && !matchedAllowList) {
            return true;
        }
        return matchedIgnoreList;
    }

    async npmInstallFirewallConsumerIfNeeded(
        dirpath: string,
        options?: IntegrateOptions,
    ): Promise<void> {
        await this.installNodeModuleIfNeeded('@ironblocks/firewall-consumer', dirpath, options);
    }

    private async installNodeModuleIfNeeded(
        dependency: string,
        dirpath: string,
        options?: IntegrateOptions,
    ): Promise<void> {
        if (await this.isNodeModuleInstalled(dependency, dirpath)) {
            return;
        }

        await this.installNodeModule(dependency, dirpath, options);
    }

    private async isNodeModuleInstalled(dependency: string, dirpath: string): Promise<boolean> {
        try {
            const { stdout } = await execAsync('npm list', { cwd: dirpath });
            if (stdout && stdout.includes(dependency)) {
                return true;
            }
        } catch (err) {}
        return false;
    }

    private async installNodeModule(
        dependency: string,
        dirpath: string,
        options?: IntegrateOptions,
    ): Promise<void> {
        const answer = await this.inquirer.ask<{ installDependencies: string }>(
            'firewall-integrate-questions',
            undefined,
        );
        const { installDependencies } = answer;
        if (installDependencies !== 'yes') {
            throw new Error(`missing required dependency '${dependency}'`);
        }

        return new Promise((resolve, reject) => {
            const args = ['install'].concat(
                !options?.verbose ? ['--silent'] : [],
                ['--force'],
                [dependency],
            );

            const spawned = spawn('npm', args, {
                cwd: dirpath,
                stdio: 'inherit',
                detached: false,
            });
            spawned.on('exit', (exitcode: number) => {
                if (exitcode === 0) {
                    resolve();
                } else {
                    reject(new Error(`cannot install dependency '${dependency}'`));
                }
            });
        });
    }

    /**
     * Customize a solidity file to integrate with the "firewall".
     *
     * @param path
     * @returns true iff any changes were made to the file.
     */
    async customizeSolidityFile(path: string, options?: IntegrateOptions): Promise<boolean> {
        const contractNamesToCustomize = new Set([parse(path).name]);

        const originalCode = await readFile(path, 'utf8');
        const parsed = this.parseSolidityCode(originalCode);
        this.validateSolidityVersion(parsed);

        try {
            let customizedCode: string;
            customizedCode = parsed.children.reduceRight((customized, child) => {
                return this.customizeContractInPlace(
                    customized,
                    child,
                    contractNamesToCustomize,
                    options,
                );
            }, originalCode);

            if (
                customizedCode === originalCode &&
                !parsed.children.some(this.alreadyCustomizedContractHeader)
            ) {
                // No need to add firewall imports since the file is not using the firewall.
                return false;
            }

            // Adding imports if needed.
            customizedCode = this.customizeImports(parsed, customizedCode);
            if (customizedCode === originalCode) {
                return false;
            }

            // Overriding original file.
            await writeFile(path, customizedCode);
            return true;
        } catch (err) {
            throw new UnsupportedFileFormatError();
        }
    }

    private parseSolidityCode(code: string): ParsedSolidityConstructs {
        try {
            const parsed = parseSolidity(code, {
                tolerant: true,
                range: true,
            }) as ParsedSolidityConstructs;
            return parsed;
        } catch (err) {
            throw new UnsupportedFileFormatError();
        }
    }

    private validateSolidityVersion(parsed: ParsedSolidityConstructs): void {
        const pragma = (parsed?.children ?? []).find(({ type }) => type === 'PragmaDirective');
        if (!pragma) {
            return;
        }
        const { value } = pragma;
        if (!!value && !intersects(value, SUPPORTED_SOLIDITY_VERSIONS)) {
            throw new UnsupportedSolidityVersionError(value);
        }
    }

    /**
     * Customizing a contact in place only if it passes the name filter,
     * and adding all of its base contracts to the filter so that they will be processed next (if they appear in the file).
     *
     * @param code
     * @param contract
     * @param contractNamesToCustomize
     * @returns
     */
    private customizeContractInPlace(
        code: string,
        contract: SolidityConstruct,
        contractNamesToCustomize: Set<string>,
        options?: IntegrateOptions,
    ): string | null {
        const { type, kind, name, range } = contract;
        const isContractDefinition = type === 'ContractDefinition';
        const isContract = kind === 'abstract' || kind === 'contract';
        const isMatchingContract = contractNamesToCustomize.has(name);
        const shouldCustomize = isContractDefinition && isContract && isMatchingContract;
        if (!shouldCustomize) {
            return code;
        }

        const [startIndex, endIndex] = range;
        const contractCode = code.substring(startIndex, endIndex + 1);
        const customizedContractCode = this.customizeContractCode(contract, contractCode, options);
        if (
            customizedContractCode !== contractCode ||
            this.alreadyCustomizedContractHeader(contract)
        ) {
            (contract.baseContracts || []).forEach(({ baseName }) => {
                if (baseName?.namePath && baseName?.namePath !== FW_BASE_CONTRACT) {
                    contractNamesToCustomize.add(baseName.namePath);
                }
            });
        }
        // Editing the contract code section whithin the file.
        const customizedCode =
            code.slice(0, startIndex) + customizedContractCode + code.slice(endIndex + 1);
        return customizedCode;
    }

    private customizeContractCode(
        contract: SolidityConstruct,
        contractCode: string,
        options?: IntegrateOptions,
    ): string {
        const alreadyCustomizedHeader = this.alreadyCustomizedContractHeader(contract);
        const methods = contract.subNodes.filter(({ type }) => type === 'FunctionDefinition');
        const alreadyCustomizedSomeMethods = methods.some(
            this.alreadyCustomizedContractMethod.bind(this),
        );
        // Add custom modifiers to contract methods.
        const contractCodeWithCustomizedMethods = this.customizeContractMethods(
            contractCode,
            contract,
            methods,
            options,
        );

        if (
            contractCodeWithCustomizedMethods === contractCode &&
            (alreadyCustomizedHeader || !alreadyCustomizedSomeMethods)
        ) {
            return contractCode;
        } else if (alreadyCustomizedHeader) {
            return contractCodeWithCustomizedMethods;
        }

        // Add base contract inheritance to contract declaration.
        const customizedContractCode = contractCodeWithCustomizedMethods.replace(
            RE_CONTRACT_DEFINITION,
            (
                match: string,
                declaration: string,
                name: string,
                inheritance: string = '',
                baseContracts: string = '',
            ) => {
                if (baseContracts) {
                    const is = inheritance.substring(0, inheritance.length - baseContracts.length);
                    const [indentation] = baseContracts.match(RE_INDENTATION) || [' '];
                    // Inheritance is placed leftmost to prevent inheritance linearization error.
                    const customizedInheritance = `${is}${FW_BASE_CONTRACT},${indentation}${baseContracts}`;
                    return `${declaration}${customizedInheritance}`;
                }

                return `${declaration} is ${FW_BASE_CONTRACT}`;
            },
        );
        return customizedContractCode;
    }

    private customizeContractMethods(
        contractCode: string,
        contract: SolidityConstruct,
        methods: SolidityConstruct[],
        options?: IntegrateOptions,
    ): string {
        const [contractStartIndex, _] = contract.range;
        // Customizing methods from the bottom up not to affect other methods' start and end indexes.
        const customizedMethods = methods.reduceRight((customized, method) => {
            const [methodStartIndex, methodEndIndex] = method.range;
            const [relativeStartIndex, relativeEndIndex] = [
                methodStartIndex - contractStartIndex,
                methodEndIndex - contractStartIndex,
            ];
            const methodCode = contractCode.substring(relativeStartIndex, relativeEndIndex + 1);
            const customizedMethodCode = this.customizeMethodCode(
                contract,
                method,
                methodCode,
                options,
            );
            const customizedCode =
                customized.slice(0, relativeStartIndex) +
                customizedMethodCode +
                customized.slice(relativeEndIndex + 1);
            return customizedCode;
        }, contractCode);
        return customizedMethods;
    }

    private customizeMethodCode(
        contract: SolidityConstruct,
        method: SolidityConstruct,
        methodCode: string,
        options?: IntegrateOptions,
    ): string {
        const isAbstract = !method.body;
        const firewallModifiers = (method.modifiers || []).filter((modifier) =>
            FIREWALL_MODIFIERS.includes(modifier?.name as FirewallModifier),
        );
        const requiredModifiers = this.getModifiersToAdd(method, options);
        const hasMismatchingModifiers = firewallModifiers.length !== requiredModifiers.length;
        const shouldCustomize =
            !isAbstract && hasMismatchingModifiers && !!options[method.visibility];
        if (!shouldCustomize) {
            return methodCode;
        }

        try {
            const customizedMethodCode = methodCode.replace(
                RE_METHOD_DEFINITION,
                (
                    match: string,
                    func: string = '',
                    signature: string,
                    name: string,
                    params: string = '',
                    visibility: string = '',
                    modifiers: string = '',
                    returns: string = '',
                ) => {
                    const isImmutableState = !!modifiers.match(RE_IMMUTABLE_STATE);
                    if (isImmutableState) {
                        return match;
                    }

                    const [indentation] = modifiers.match(RE_INDENTATION) || [' '];
                    const modifiersToAdd = requiredModifiers
                        .map((name) => this.serializerByModifier[name](contract, method))
                        .join(indentation);

                    if (modifiers) {
                        // Remove existing firewall modifiers.
                        modifiers = modifiers.replace(RE_FW_MODIFIER, '');
                        return `${func}${signature}${visibility}${modifiers}${indentation}${modifiersToAdd}${returns}`;
                    }

                    return `${func}${signature}${visibility} ${modifiersToAdd}${returns}`;
                },
            );

            return customizedMethodCode;
        } catch (err) {
            if (err instanceof UnsupportedParamTypeError) {
                const warning = `cannot integrate function "${contract.name}.${method.name}", ${err.message}`;
                this.logger.warn(warning);
                return methodCode;
            }
            throw err;
        }
    }

    private customizeImports(parsed: ParsedSolidityConstructs, code: string): string {
        const imports = parsed.children.filter(({ type }) => type === 'ImportDirective');
        if (this.alreadyCustomizedImports(imports)) {
            return code;
        }

        // In case there are existing importing.
        if (imports.length) {
            const [firstImport] = imports;
            const [firstImportStartIndex, _firstImportEndIndex] = firstImport.range;
            const customizedImports = `${FW_IMPORT}\r\n`;
            // Editing imports section whithin the file.
            const customizedCode =
                code.slice(0, firstImportStartIndex) +
                customizedImports +
                code.slice(firstImportStartIndex);
            return customizedCode;
        }

        const [firstDirective] = parsed.children;
        // In case there is a pragma (and no existing imports).
        if (firstDirective.type === 'PragmaDirective') {
            const [_pragmaStartIndex, pragmaEndIndex] = firstDirective.range;
            const customizedImports = `\r\n\r\n${FW_IMPORT}`;
            // Editing imports section whithin the file.
            const customizedCode =
                code.slice(0, pragmaEndIndex + 1) +
                customizedImports +
                code.slice(pragmaEndIndex + 1);
            return customizedCode;
        }

        return `${FW_IMPORT}\r\n\r\n${code}`;
    }

    private alreadyCustomizedImports(imports: SolidityConstruct[]): boolean {
        const fwImport = imports.find(({ path }) => path === FW_IMPORT_PATH);
        return !!fwImport;
    }

    private alreadyCustomizedContractHeader(contract: SolidityConstruct): boolean {
        return (contract.baseContracts || []).some(
            (base) => base.baseName?.namePath === FW_BASE_CONTRACT,
        );
    }

    private alreadyCustomizedContractMethod(method: SolidityConstruct): boolean {
        return (method.modifiers || []).some(
            (modifier) => !!this.serializerByModifier[modifier.name],
        );
    }

    private getModifiersToAdd(
        method: SolidityConstruct,
        options?: IntegrateOptions,
    ): FirewallModifier[] {
        switch (method.visibility) {
            case 'external':
                if (options?.modifiers?.includes(FW_INVARIANT_PROTECTED_MODIFIER)) {
                    return [FW_PROTECTED_MODIFIER, FW_INVARIANT_PROTECTED_MODIFIER];
                }
                return [FW_PROTECTED_MODIFIER];
            case 'internal':
                return [FW_PROTECTED_SIG_MODIFIER];
            default:
                return [];
        }
    }

    private calcSighash(contract: SolidityConstruct, method: SolidityConstruct): string {
        const contractName = contract.name;
        const methodName = method.name!;
        const paramTypes = (method.parameters || []).map((param) => {
            try {
                return this.getParamTypeName(param.typeName);
            } catch (err) {
                throw new UnsupportedParamTypeError(`unsupported type of param "${param.name}"`);
            }
        });
        const sig = `${contractName}.${methodName}(${paramTypes.join(',')})`;
        const sigHash = ethers.id(sig).slice(0, 10);
        return sigHash;
    }

    private getParamTypeName(paramtType: SolidityConstruct): string {
        const rawTypeName = paramtType?.name || paramtType?.namePath;
        switch (paramtType?.type) {
            case 'ArrayTypeName':
                const baseTypeName = this.getParamTypeName(paramtType?.baseTypeName);
                return `${baseTypeName}[${paramtType?.length?.number || ''}]`;
            case 'UserDefinedTypeName':
                return rawTypeName;
            case 'ElementaryTypeName':
                if (rawTypeName === 'int' || rawTypeName === 'uint') {
                    // Explicit type conversions: int => int256, uint => uint256.
                    return `${rawTypeName}256`;
                }
                return rawTypeName;
            default:
                throw new Error();
        }
    }
}

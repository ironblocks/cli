import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse as parseSolidity } from '@solidity-parser/parser';
import {
    ContractDefinition,
    FunctionDefinition,
    ImportDirective,
    ModifierInvocation,
    PragmaDirective,
    SourceUnit,
} from '@solidity-parser/parser/dist/src/ast-types';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { any as pathMatch } from 'micromatch';
import { InquirerService } from 'nest-commander';
import { join, parse } from 'path';
import { intersects } from 'semver';

import { UnsupportedFileFormatError } from '@/firewall/integration/errors/unsupported.file.format.error';
import { UnsupportedParamTypeError } from '@/firewall/integration/errors/unsupported.param.type.error';
import { UnsupportedSolidityVersionError } from '@/firewall/integration/errors/unsupported.solidity.version.error';
import { LoggerService } from '@/lib/logging/logger.service';

const MSG_SENDER = 'msg.sender';

const FW_IMPORT_PATH = '@ironblocks/firewall-consumer/contracts/consumers/VennFirewallConsumer.sol';
const FW_CONTRACT = 'VennFirewallConsumer';
const FW_IMPORT = `import {${FW_CONTRACT}} from "${FW_IMPORT_PATH}";`;

const FW_PROTECTED_MODIFIER = 'firewallProtected';

const FW_STORAGE_SLOT = 'bytes32(uint256(keccak256("eip1967.firewall")) - 1)';
const FW_ADMIN_STORAGE_SLOT = 'bytes32(uint256(keccak256("eip1967.firewall.admin")) - 1)';

const FW_PROXY_INITIALIZER_MODIFIER = 'initializer';
const FW_PROXY_REINITIALIZER_MODIFIER = 'reinitializer';

const FW_PROXY_SETUP = `_setAddressBySlot(${FW_STORAGE_SLOT}, address(0));`;
const FW_PROXY_ADMIN_SETUP = () => `_setAddressBySlot(${FW_ADMIN_STORAGE_SLOT}, ${MSG_SENDER});`;
const FW_PROXY_FULL_SETUP = () => `\n\t\t${FW_PROXY_SETUP}\n\t\t${FW_PROXY_ADMIN_SETUP()}`;

export interface IntegrateOptions {
    verbose?: boolean;
    external?: boolean;
    internal?: boolean;
    msgValue?: boolean;
}

export const SUPPORTED_SOLIDITY_VERSIONS = '>= 0.8';

const RE_SOLIDITY_FILE_NAME = new RegExp(`\\w+\\.sol$`, 'g');

const RE_COMMENTS = new RegExp(`(?:\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)`, 'g');
const RE_BLANK_SPACE = new RegExp(`(?:(?:\\s)|${RE_COMMENTS.source})`, 'g');

interface ContractChange {
    start: number;
    end: number;
    replacement: string;
}
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

const RE_FW_CONTRACT = new RegExp(`(?<fwContract>(?:${FW_CONTRACT}(?:Base${RE_BLANK_SPACE.source}*\\(.*\\))?))`, 'gs');

const RE_BASE_CONTRACTS = new RegExp(`(?<baseContracts>(?:${RE_BLANK_SPACE.source}*[\\w,()]+)+)`, 'g');
const RE_INHERITANCE = new RegExp(
    `(?<inheritance>${RE_BLANK_SPACE.source}+is${RE_BLANK_SPACE.source}+${RE_BASE_CONTRACTS.source})`,
    'g',
);
const RE_CONTRACT_DEFINITION = new RegExp(`^${RE_CONTRACT_DECLARATION.source}${RE_INHERITANCE.source}?`, 'g');

/**
 * Gradually composing a regex to match the following pattern:
 *
 * (function)? <signature>(<name>(...params)) <visibility>? <modifiers>? (returns (...params)?)?
 */
const RE_FUNCTION = new RegExp(`(?<func>function)`, 'g');
const RE_PARAMS = new RegExp(`(?<params>${RE_BLANK_SPACE.source}*[\\w,\\.\\[\\]]+(?:${RE_BLANK_SPACE.source}*))*`, 'g');
const RE_SIGNATURE = new RegExp(
    `(?<signature>${RE_BLANK_SPACE.source}+(?<name>${RE_NAME.source})${RE_BLANK_SPACE.source}*\\(${RE_PARAMS.source}\\))`,
    'g',
);
const RE_VISIBILITY = new RegExp(`(?<visibility>${RE_BLANK_SPACE.source}*(?:public|external|internal|private))`, 'g');
const RE_MODIFIERS = new RegExp(`(?<modifiers>(?:${RE_BLANK_SPACE.source}*(?!returns)[\\w,\\.\\(\\)\\[\\]]+)*)`, 'g');
const RE_IMMUTABLE_STATE = new RegExp(`\\pure|view\\b`, 'i');
const RE_RETURNS = new RegExp(`(?<returns>${RE_BLANK_SPACE.source}*returns[^{]+)`, 'g');
const RE_METHOD_DEFINITION = new RegExp(
    `^${RE_FUNCTION.source}?${RE_SIGNATURE.source}${RE_VISIBILITY.source}?${RE_MODIFIERS.source}?${RE_RETURNS.source}?`,
    'g',
);

const RE_FW_MODIFIER = new RegExp(
    `${RE_BLANK_SPACE.source}*${FW_PROTECTED_MODIFIER}(?:${RE_BLANK_SPACE.source}*)?`,
    'g',
);

@Injectable()
export class IntegrationUtils {
    constructor(
        private readonly inquirer: InquirerService,
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
    ) {}

    async assertFileExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isFile()) {
                throw new Error();
            }
        } catch (_err) {
            throw new Error(`file does not exist '${path}'`);
        }
    }

    async assertDirExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isDirectory()) {
                throw new Error();
            }
        } catch (_err) {
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
                    child as ContractDefinition,
                    contractNamesToCustomize,
                    options,
                );
            }, originalCode);

            if (
                customizedCode === originalCode &&
                !parsed.children.some(contract => this.alreadyCustomizedContractHeader(contract as ContractDefinition))
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
        } catch (_err) {
            throw new UnsupportedFileFormatError();
        }
    }

    private parseSolidityCode(code: string): SourceUnit {
        try {
            const parsed = parseSolidity(code, {
                tolerant: true,
                range: true,
            });
            return parsed;
        } catch (_err) {
            throw new UnsupportedFileFormatError();
        }
    }

    private validateSolidityVersion(parsed: SourceUnit): void {
        const pragma = (parsed?.children ?? []).find(({ type }) => type === 'PragmaDirective') as PragmaDirective;
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
     * @returns the customized code
     */
    private customizeContractInPlace(
        code: string,
        contract: ContractDefinition,
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
        if (customizedContractCode !== contractCode || this.alreadyCustomizedContractHeader(contract)) {
            (contract.baseContracts || []).forEach(({ baseName }) => {
                if (baseName?.namePath && baseName.namePath !== FW_CONTRACT) {
                    contractNamesToCustomize.add(baseName.namePath);
                }
            });
        }
        // Editing the contract code section whithin the file.
        const customizedCode = code.slice(0, startIndex) + customizedContractCode + code.slice(endIndex + 1);
        return customizedCode;
    }

    private customizeContractCode(
        contract: ContractDefinition,
        contractCode: string,
        options?: IntegrateOptions,
    ): string {
        const alreadyCustomizedHeader = this.alreadyCustomizedContractHeader(contract);
        const methods = contract.subNodes.filter(({ type }) => type === 'FunctionDefinition') as FunctionDefinition[];
        const alreadyCustomizedSomeMethods = methods.some(this.alreadyCustomizedContractMethod.bind(this));

        let changesToApply: ContractChange[] = [];
        // Add custom modifiers to contract methods.
        changesToApply = changesToApply.concat(this.customizeContractMethods(contractCode, contract, methods, options));

        // Replace msg.value with _msgValue() if the option is enabled
        if (options?.msgValue) {
            changesToApply = changesToApply.concat(this.replaceMsgValueWithMsgValueFunction(contract));
        }

        let customizedContractCode = this.applyChanges(contractCode, changesToApply);

        if (customizedContractCode === contractCode && (alreadyCustomizedHeader || !alreadyCustomizedSomeMethods)) {
            return contractCode;
        } else if (alreadyCustomizedHeader) {
            return customizedContractCode;
        }

        const fwInheritedContract = FW_CONTRACT;

        // Add base contract inheritance to contract declaration.
        customizedContractCode = customizedContractCode.replace(
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

                    // In case the contract already inherits from the firewall contract,
                    // it has to be overrided by FirevallConsumerBase or vice versa.
                    // This case is possible when user runs integration multiple times.
                    // I.E. first time - run integration with multisig address - FirewallConsumerBase is inherited,
                    // second time - run integration without multisig address - FirewallConsumer is inherited.
                    const fwIsAlreadyInherited = baseContracts.match(RE_FW_CONTRACT);

                    // Inheritance is placed leftmost to prevent inheritance linearization error.
                    // In overriding case, firewall contract is just replaced with the new one and the order is omitted.

                    const customizedInheritance = fwIsAlreadyInherited
                        ? inheritance.replace(RE_FW_CONTRACT, fwInheritedContract)
                        : `${is}${fwInheritedContract},${indentation}${baseContracts}`;

                    return `${declaration}${customizedInheritance}`;
                }

                return `${declaration} is ${fwInheritedContract}`;
            },
        );
        return customizedContractCode;
    }

    private customizeContractMethods(
        contractCode: string,
        contract: ContractDefinition,
        methods: FunctionDefinition[],
        options?: IntegrateOptions,
    ): ContractChange[] {
        return methods.map(method => {
            const methodHeaderStartIndex = method.range[0];
            const methodHeaderEndIndex = method.body?.range[0] ?? method.range[1];
            const [contractStartIndex] = contract.range;
            const relativeStartIndex = methodHeaderStartIndex - contractStartIndex;
            const relativeEndIndex = methodHeaderEndIndex - contractStartIndex;
            const methodCode = contractCode.substring(relativeStartIndex, relativeEndIndex + 1);
            const customizedMethodCode = this.customizeMethodCode(contract, method, methodCode, options);

            return {
                start: relativeStartIndex,
                end: relativeEndIndex + 1,
                replacement: customizedMethodCode,
            };
        });
    }

    private customizeMethodCode(
        contract: ContractDefinition,
        method: FunctionDefinition,
        methodCode: string,
        options?: IntegrateOptions,
    ): string {
        const isAbstract = !method.body;
        const hasMismatchingModifiers = method.modifiers?.length !== FW_PROTECTED_MODIFIER.length;
        const shouldCustomize = !isAbstract && hasMismatchingModifiers && !!options[method.visibility];
        if (!shouldCustomize) {
            return methodCode;
        }

        try {
            let customizedMethodCode = methodCode.replace(
                RE_METHOD_DEFINITION,
                (
                    match: string,
                    func: string = '',
                    signature: string,
                    name: string,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                    const modifiersToAdd = FW_PROTECTED_MODIFIER;

                    if (modifiers) {
                        // Remove existing firewall modifiers.
                        modifiers = modifiers.replace(RE_FW_MODIFIER, '');
                        return `${func}${signature}${visibility}${modifiers}${indentation}${modifiersToAdd}${returns}`;
                    }

                    return `${func}${signature}${visibility} ${modifiersToAdd}${returns}`;
                },
            );

            if (this.proxyModifiersAreDetected(method?.modifiers)) {
                customizedMethodCode = this.customizeProxyInitializer(customizedMethodCode);
            }

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

    private customizeImports(parsed: SourceUnit, code: string): string {
        const imports = parsed.children.filter(({ type }) => type === 'ImportDirective') as ImportDirective[];
        if (this.alreadyCustomizedImports(imports)) {
            return code;
        }

        // In case there are existing importing.
        if (imports.length) {
            const [firstImport] = imports;
            const [firstImportStartIndex] = firstImport.range;
            const customizedImports = `${FW_IMPORT}\r\n`;
            // Editing imports section whithin the file.
            const customizedCode =
                code.slice(0, firstImportStartIndex) + customizedImports + code.slice(firstImportStartIndex);
            return customizedCode;
        }

        const [firstDirective] = parsed.children;
        // In case there is a pragma (and no existing imports).
        if (firstDirective.type === 'PragmaDirective') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_pragmaStartIndex, pragmaEndIndex] = firstDirective.range;
            const customizedImports = `\r\n\r\n${FW_IMPORT}`;
            // Editing imports section whithin the file.
            const customizedCode =
                code.slice(0, pragmaEndIndex + 1) + customizedImports + code.slice(pragmaEndIndex + 1);
            return customizedCode;
        }

        return `${FW_IMPORT}\r\n\r\n${code}`;
    }

    private customizeProxyInitializer(methodCode: string): string {
        const lastBracketIndex = methodCode.lastIndexOf('}');
        return methodCode.slice(0, lastBracketIndex) + `${FW_PROXY_FULL_SETUP()}` + '\n\t}';
    }

    private replaceMsgValueWithMsgValueFunction(contract: ContractDefinition): ContractChange[] {
        const changes: ContractChange[] = [];

        // Recursively traverse the AST to find msg.value expressions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const traverse = (node: any) => {
            if (
                node.type === 'MemberAccess' &&
                node.expression?.type === 'Identifier' &&
                node.expression.name === 'msg' &&
                node.memberName === 'value'
            ) {
                const [nodeStartIndex, nodeEndIndex] = node.range;
                const [contractStartIndex] = contract.range;
                const relativeStartIndex = nodeStartIndex - contractStartIndex;
                const relativeEndIndex = nodeEndIndex - contractStartIndex;
                changes.push({
                    start: relativeStartIndex,
                    end: relativeEndIndex + 1,
                    replacement: '_msgValue()',
                });
                return;
            }

            // iterate all properties of the node and call traverse on them
            Object.values(node).forEach(value => {
                if (typeof value === 'object' && value !== null) {
                    traverse(value);
                }
            });
        };

        traverse(contract);

        return changes;
    }

    private applyChanges(code: string, changes: ContractChange[]): string {
        // Sort changes by start index in ascending order
        changes.sort((a, b) => a.start - b.start);

        // If there is an intersection between changes, throw an error
        for (let i = 0; i < changes.length - 1; i++) {
            if (changes[i].start <= changes[i + 1].end && changes[i].end >= changes[i + 1].start) {
                throw new Error('Changes intersect');
            }
        }

        // Apply changes from the bottom up to avoid affecting other changes' start and end indexes
        return changes.reduceRight((code, change) => {
            return code.slice(0, change.start) + change.replacement + code.slice(change.end);
        }, code);
    }

    private alreadyCustomizedImports(imports: ImportDirective[]): boolean {
        const fwImport = imports.find(({ path }) => path === FW_IMPORT_PATH);
        return !!fwImport;
    }

    private alreadyCustomizedContractHeader(contract: ContractDefinition): boolean {
        // if header already contains FirewallConsumer or FirewallConsumeBase
        // it is conisdered customized in 2 cases:
        // 1. multisig address IS provided && the contract inherits from the FirewallConsumeBase.
        // 2. multisig address IS NOT provided && the contract inherits from the FirewallConsumer.
        return (contract.baseContracts || []).some(base => base.baseName?.namePath === FW_CONTRACT);
    }

    private alreadyCustomizedContractMethod(method: FunctionDefinition): boolean {
        return (method.modifiers || []).some(modifier => modifier.name === FW_PROTECTED_MODIFIER);
    }

    private proxyModifiersAreDetected(modifiers: ModifierInvocation[]): boolean {
        // Modifiers supposed to be used from openzeppelin library.
        // Only two modifiers are available in openzeppelin that indicates proxy.
        // 1. initializer 2. reinitializer(uint8 version)
        return modifiers.some(
            modifier =>
                (modifier.name === FW_PROXY_INITIALIZER_MODIFIER && !modifier.arguments) ||
                (modifier.name === FW_PROXY_REINITIALIZER_MODIFIER &&
                    modifier.arguments?.length == 1 &&
                    modifier.arguments[0].type == 'NumberLiteral'),
        );
    }
}

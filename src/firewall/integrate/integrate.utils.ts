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
import { any as pathMatch } from 'micromatch';

type ParsedSolidityConstructs = {
    children: SolidityConstruct[];
    errors: unknown[];
    range: [number, number];
};

type SolidityConstruct = {
    type: string;
    range: [number, number];
    subNodes?: SolidityConstruct[];

    name?: string;
    baseContracts?: SolidityConstruct[];
    baseName?: SolidityConstruct;
    namePath?: string;
    visibility?: string;
    isConstructor?: boolean;
    modifiers?: SolidityConstruct[];
};

const execAsync = promisify(exec);

const RE_SOLIDITY_FILE_NAME = new RegExp(`\\w+\\.sol$`, 'g');

const RE_COMMENTS = new RegExp(`(?:\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)`, 'g');
const RE_BLANK_SPACE = new RegExp(`(?:(?:\\s)|${RE_COMMENTS.source})`, 'g');

/**
 * Gradually composing a regex to match the following pattern:
 *
 * contract <name> (is X, Y, Z)
 */
const RE_NAME = new RegExp(`\\w+`, 'g');
const RE_CONTRACT_DECLARATION = new RegExp(
    `(?<declaration>contract${RE_BLANK_SPACE.source}+(?<name>${RE_NAME.source}))`,
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
const RE_FUNCTION = new RegExp(`(?<func>function${RE_BLANK_SPACE.source}+)`, 'g');
const RE_PARAMS = new RegExp(`(?<params>[\\w,]+(?:${RE_BLANK_SPACE.source}*))*`, 'g');
const RE_SIGNATURE = new RegExp(
    `(?<signature>(?<name>${RE_NAME.source})${RE_BLANK_SPACE.source}*\\(${RE_BLANK_SPACE.source}*${RE_PARAMS.source}\\)${RE_BLANK_SPACE.source}*)`,
    'g',
);
const RE_VISIBILITY = new RegExp(
    `(?<visibility>(?:public|external|internal|private)${RE_BLANK_SPACE.source}*)`,
    'g',
);
const RE_MODIFIERS = new RegExp(
    `(?<modifiers>(?:(?!returns)[\\w,\\.\\(\\)]+${RE_BLANK_SPACE.source}*)*)`,
    'g',
);
const RE_IMMUTABLE_STATE = new RegExp(`\\pure|view\\b`, 'i');
const RE_RETURNS = new RegExp(`(?<returns>returns[^{]+${RE_BLANK_SPACE.source}*)`, 'g');
const RE_METHOD_DEFINITION = new RegExp(
    `^${RE_FUNCTION.source}?${RE_SIGNATURE.source}${RE_VISIBILITY.source}?${RE_MODIFIERS.source}?${RE_RETURNS.source}?`,
    'g',
);

const BASE_CONTRACT_TO_INHERIT = 'FirewallConsumerBase';
const MODIFIER_TO_ADD = 'firewallProtected';

@Injectable()
export class FirewallIntegrateUtils {
    constructor(
        private readonly inquirer: InquirerService,
        private readonly config: ConfigService,
    ) {}

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
        const ignoreList = this.config.get<string[]>('fwIntegIgnore') ?? [];
        const matchedIgnoreList = pathMatch(path, ignoreList);
        return matchedIgnoreList;
    }

    async npmInstallFirewallConsumerIfNeeded(dirpath: string): Promise<void> {
        await this.installNodeModuleIfNeeded('@ironblocks/firewall-consumer', dirpath);
    }

    private async installNodeModuleIfNeeded(dependency: string, dirpath: string): Promise<void> {
        if (await this.isNodeModuleInstalled(dependency, dirpath)) {
            return;
        }

        await this.installNodeModule(dependency, dirpath);
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

    private async installNodeModule(dependency: string, dirpath: string): Promise<void> {
        const answer = await this.inquirer.ask<{ installDependencies: string }>(
            'firewall-integrate-questions',
            undefined,
        );
        const { installDependencies } = answer;
        if (installDependencies !== 'yes') {
            throw new Error(`missing required dependency '${dependency}'`);
        }

        return new Promise((resolve, reject) => {
            const spawned = spawn('npm', ['install', '--silent', dependency], {
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
    async customizeContractFile(path: string): Promise<boolean> {
        const content = await readFile(path, 'utf8');
        const contractNameFilter = parse(path).name;

        try {
            const parsed = parseSolidity(content, {
                tolerant: true,
                range: true,
            }) as ParsedSolidityConstructs;

            const parsedContract = parsed.children.find(({ type, name }) => {
                const isContractDefinition = type === 'ContractDefinition';
                const isMatchingContract = name === contractNameFilter;
                return isContractDefinition && isMatchingContract;
            });
            if (!parsedContract) {
                return false;
            }

            const [contractStartIndex, contractEndIndex] = parsedContract.range;
            const contractCode = content.substring(contractStartIndex, contractEndIndex + 1);
            const customizedContractCode = this.customizeContractCode(parsedContract, contractCode);
            const customizedCode =
                content.slice(0, contractStartIndex) +
                customizedContractCode +
                content.slice(contractEndIndex + 1);
            if (customizedCode === content) {
                return false;
            }

            // Overriding original file.
            await writeFile(path, customizedCode);
            return true;
        } catch (err) {
            throw new Error(`unsupported file format '${path}'`);
        }
    }

    private customizeContractCode(contract: SolidityConstruct, contractCode: string): string {
        const alreadyCustomizedHeader = this.alreadyCustomizedContractHeader(contract);
        const methods = contract.subNodes.filter(({ type }) => type === 'FunctionDefinition');
        const alreadyCustomizedSomeMethods = methods.some(this.alreadyCustomizedContractMethod);
        // Add custom modifiers to contract methods.
        const contractCodeWithCustomizedMethods = this.customizeContractMethods(
            contractCode,
            contract,
            methods,
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
                    const customizedInheritance = `${is}${baseContracts}, ${BASE_CONTRACT_TO_INHERIT}`;
                    return `${declaration}${customizedInheritance}`;
                }

                return `${declaration} is ${BASE_CONTRACT_TO_INHERIT}`;
            },
        );
        return customizedContractCode;
    }

    private customizeContractMethods(
        contractCode: string,
        contract: SolidityConstruct,
        methods: SolidityConstruct[],
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
            const customizedMethodCode = this.customizeMethodCode(method, methodCode);
            const customizedCode =
                customized.slice(0, relativeStartIndex) +
                customizedMethodCode +
                customized.slice(relativeEndIndex + 1);
            return customizedCode;
        }, contractCode);
        return customizedMethods;
    }

    private customizeMethodCode(method: SolidityConstruct, methodCode: string): string {
        const alreadyCustomized = this.alreadyCustomizedContractMethod(method);
        if (alreadyCustomized || method.visibility !== 'external') {
            return methodCode;
        }

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

                if (modifiers) {
                    return `${func}${signature}${visibility}${modifiers}${MODIFIER_TO_ADD} ${returns}`;
                }

                return `${func}${signature}${visibility}${MODIFIER_TO_ADD} ${returns}`;
            },
        );

        return customizedMethodCode;
    }

    private alreadyCustomizedContractHeader(contract: SolidityConstruct): boolean {
        return (contract.baseContracts ?? []).some(
            (base) => base.baseName?.namePath === BASE_CONTRACT_TO_INHERIT,
        );
    }

    private alreadyCustomizedContractMethod(method: SolidityConstruct): boolean {
        return (method.modifiers ?? []).some((modifier) => modifier.name === MODIFIER_TO_ADD);
    }
}

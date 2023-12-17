// Builtin.
import { exec, spawn } from 'child_process';
import { stat, readdir, readFile, writeFile } from 'fs/promises';
import { join, parse } from 'path';
import { promisify } from 'util';
// 3rd party.
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';
import { parse as parseSolidity } from '@solidity-parser/parser';

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
    constructor(private readonly inquirer: InquirerService) {}

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
        return RE_SOLIDITY_FILE_NAME.test(path);
    }

    async getSolidityFilesInDir(dirpath: string, recursive: boolean): Promise<string[]> {
        const solifityFiles = [];
        const files = await readdir(dirpath);
        await Promise.all(
            files.map(async (filename) => {
                const path = join(dirpath, filename);
                const stats = await stat(path);
                if (stats.isFile() && this.isSolidityFile(path)) {
                    solifityFiles.push(path);
                }
                if (stats.isDirectory() && recursive) {
                    const subDirectoryFiles = await this.getSolidityFilesInDir(path, recursive);
                    solifityFiles.push(...subDirectoryFiles);
                }
            }),
        );
        return solifityFiles;
    }

    async npmInstallFirewallConsumer(dirpath: string): Promise<void> {
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

    async customizeContractFile(path: string): Promise<void> {
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
            const [contractStartIndex, contractEndIndex] = parsedContract.range;
            const contractCode = content.substring(contractStartIndex, contractEndIndex + 1);
            const customizedContractCode = this.customizeContractCode(parsedContract, contractCode);
            const customizedCode =
                content.slice(0, contractStartIndex) +
                customizedContractCode +
                content.slice(contractEndIndex + 1);
            // Overriding original file.
            await writeFile(path, customizedCode);
        } catch (err) {
            throw new Error(`unsupported file format '${path}'`);
        }
    }

    private customizeContractCode(contract: SolidityConstruct, contractCode: string): string {
        const isAlreadyCustomized = (contract.baseContracts ?? []).some(
            (base) => base.baseName?.namePath === BASE_CONTRACT_TO_INHERIT,
        );
        if (isAlreadyCustomized) {
            return contractCode;
        }

        // Add custom modifiers to contract methods.
        const contractCodeWithCustomizedMethods = this.customizeContractMethods(
            contract,
            contractCode,
        );
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

    private customizeContractMethods(contract: SolidityConstruct, contractCode: string): string {
        const [contractStartIndex, _] = contract.range;
        const methods = contract.subNodes.filter(({ type }) => type === 'FunctionDefinition');
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
        if (method.visibility !== 'external') {
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
                const isImmutableState = RE_IMMUTABLE_STATE.test(modifiers);
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
}

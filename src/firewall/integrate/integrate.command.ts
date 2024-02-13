// Builtin.
import { resolve } from 'path';
// 3rd party.
import { CommandRunner, Option, SubCommand } from 'nest-commander';
// Internal.
import { FirewallIntegrateService } from './integrate.service';
import type { FirewallModifier } from './integrate.utils';

type CommandOption = ReturnType<CommandRunner['command']['createOption']>;

interface CommandOptions {
    file?: string;
    dir?: string;
    rec?: boolean;
    verbose?: boolean;
    internal?: boolean;
    modifiers?: FirewallModifier[];
}

@SubCommand({
    name: 'integ',
    description: "Integrate your contracts with Ironblocks' firewall",
})
export class FirewallIntegrateCommand extends CommandRunner {
    constructor(private readonly fwIntegService: FirewallIntegrateService) {
        super();
    }

    private getCommandOption(optionName: string): CommandOption {
        const option = this.command.options.find((option) => option.attributeName() === optionName);
        return option;
    }

    private setOptionConflicts(optionName: string, conflicts: string[]): void {
        const option = this.getCommandOption(optionName);
        option.conflicts(conflicts);
    }

    async run(passedParams: string[], options?: CommandOptions): Promise<void> {
        const [unkownArg] = passedParams;
        if (!!unkownArg) {
            return this.command.error(`error: uknown argument '${unkownArg}'`);
        }

        try {
            const integOptions = {
                verbose: options?.verbose,
                external: true,
                internal: options?.internal,
                modifiers: options?.modifiers,
            };

            if (options?.file) {
                return await this.fwIntegService.integContractFile(options.file, integOptions);
            }

            if (options?.dir) {
                return await this.fwIntegService.integContractsDir(
                    options.dir,
                    options.rec,
                    integOptions,
                );
            }
        } catch (err) {
            return this.command.error(`error: ${err.message}`);
        }

        this.command.help();
    }

    @Option({
        flags: '-f, --file <string>',
        description: 'path to contract file to customize',
    })
    parseFilePath(val: string): string {
        this.setOptionConflicts('file', ['dir']);
        return resolve(val);
    }

    @Option({
        flags: '-d, --dir <string>',
        description: 'path to contracts directory to customize',
    })
    parseDirPath(val: string): string {
        this.setOptionConflicts('dir', ['file']);
        return resolve(val);
    }

    @Option({
        flags: '-r, --rec',
        description: 'recurse on all the contract files in the directory',
        defaultValue: false,
    })
    parseRecursive(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'provider additional details along the command execution',
        defaultValue: false,
    })
    parseVerbose(): boolean {
        return true;
    }

    @Option({
        flags: '-i, --internal',
        description: 'whether to add firewall protection for "internal" functions',
        defaultValue: false,
    })
    parseInternal(): boolean {
        return true;
    }

    @Option({
        flags: '-m, --modifiers <string...>',
        description: 'set advanced modifiers',
    })
    parseModifiers(val: string): FirewallModifier[] {
        const ACCEPTED_MODIFIERS = ['invariantProtected'];
        const thisOption = this.getCommandOption('modifiers');
        // This is a hotfix.
        // NestJS commander overriding "parseArg" immediately after setting it via the decorator.
        thisOption.choices(ACCEPTED_MODIFIERS);
        // @ts-expect-error accessing private variable.
        const previous = this.command._optionValues['modifiers'];
        return thisOption.parseArg(val, previous);
    }
}

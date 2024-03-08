import * as colors from 'colors';
import { resolve } from 'path';

import { CommandRunner, Option, SubCommand } from 'nest-commander';

import { Logger } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { IntegrationService } from '@/firewall/integration/integration.service';
import { DependenciesService } from '@/dependencies/dependencies.service';
import type { FirewallModifier } from '@/firewall/integration/integration.utils';
import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/integration/integration.command.descriptor';

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
    name: NAME,
    description: DESCRIPTION
})
export class IntegrationCommand extends CommandRunner {
    constructor(
        private readonly logger: Logger,
        private readonly integrationService: IntegrationService,
        private readonly dependenciesService: DependenciesService
    ) {
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

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options?: CommandOptions): Promise<void> {
        this.validateOptions(options);

        try {
            this.logger.log('Starting integration');
            await this.dependenciesService.assertDependencies();

            const integOptions = {
                verbose: options?.verbose,
                external: true,
                internal: options?.internal,
                modifiers: options?.modifiers
            };

            if (options?.file) {
                return await this.integrationService.integContractFile(options.file, integOptions);
            }

            if (options?.dir) {
                return await this.integrationService.integContractsDir(options.dir, options.rec, integOptions);
            }

            this.logger.log('All done!');
        } catch (e) {
            this.logger.error(e.message);
            this.command.error('Integration failed');
        }
    }

    private validateOptions(options?: CommandOptions): void {
        const missingFileOption = Boolean(options.file) === false;
        const missingDirOption = Boolean(options.dir) === false;

        if (missingFileOption && missingDirOption) {
            this.logger.error('No file or directory specified');
            this.command.error(`Run ${colors.bold.cyan('ib fw integ --help')} for usage information`);
        }
    }

    @Option({
        flags: '-f, --file <string>',
        description: 'path to contract file to customize'
    })
    parseFilePath(val: string): string {
        this.setOptionConflicts('file', ['dir']);
        return resolve(val);
    }

    @Option({
        flags: '-d, --dir <string>',
        description: 'path to contracts directory to customize'
    })
    parseDirPath(val: string): string {
        this.setOptionConflicts('dir', ['file']);
        return resolve(val);
    }

    @Option({
        flags: '-r, --rec',
        description: 'recurse on all the contract files in the directory',
        defaultValue: false
    })
    parseRecursive(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'provider additional details along the command execution',
        defaultValue: false
    })
    parseVerbose(): boolean {
        return true;
    }

    @Option({
        flags: '-i, --internal',
        description: 'whether to add firewall protection for "internal" functions',
        defaultValue: false
    })
    parseInternal(): boolean {
        return true;
    }

    @Option({
        flags: '-m, --modifiers <string...>',
        description: 'set advanced modifiers'
    })
    parseModifiers(val: string): FirewallModifier[] {
        const ACCEPTED_MODIFIERS = ['invariantProtected'];
        const thisOption = this.getCommandOption('modifiers');
        // This is a hotfix.
        // NestJS commander overriding "parseArg" immediately after setting it via the decorator.
        thisOption.choices(ACCEPTED_MODIFIERS);
        // @ts-ignore
        const previous = this.command._optionValues['modifiers'];
        return thisOption.parseArg(val, previous);
    }
}

// Builtin.
import { resolve } from 'path';
// 3rd party.
import { CommandRunner, Option, SubCommand } from 'nest-commander';
// Internal.
import { FirewallIntegrateService } from './integrate.service';

interface CommandOptions {
    file?: string;
    dir?: string;
    rec?: boolean;
    verbose?: boolean;
}

@SubCommand({
    name: 'integ',
    description: "Integrate your contracts with Ironblocks' firewall",
})
export class FirewallIntegrateCommand extends CommandRunner {
    constructor(private readonly fwIntegService: FirewallIntegrateService) {
        super();
    }

    private setOptionConflicts(optionName: string, conflicts: string[]): void {
        const option = this.command.options.find((option) => option.attributeName() === optionName);
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
        description: 'Path to contract file to customize',
    })
    parseFilePath(val: string): string {
        this.setOptionConflicts('file', ['dir']);
        return resolve(val);
    }

    @Option({
        flags: '-d, --dir <string>',
        description: 'Path to contracts directory to customize',
    })
    parseDirPath(val: string): string {
        this.setOptionConflicts('dir', ['file']);
        return resolve(val);
    }

    @Option({
        flags: '-r, --rec',
        description: 'Recurse on all the contract files in the directory',
        defaultValue: false,
    })
    parseRecursive(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'Provider additional details along the command execution',
        defaultValue: false,
    })
    parseVerbose(): boolean {
        return true;
    }
}

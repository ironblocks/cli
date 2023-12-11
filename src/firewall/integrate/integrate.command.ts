// Builtin.
import { dirname } from 'path';
// 3rd party.
import { CommandRunner, Option, SubCommand } from 'nest-commander';
// Internal.
import { FirewallIntegrateService } from './integrate.service';

interface CommandOptions {
    dir?: string;
    file?: string;
    recursive?: boolean;
}

@SubCommand({
    name: 'integ',
    description: 'Integrate with Ironblocks firewall',
})
export class FirewallIntegrateCommand extends CommandRunner {
    constructor(private readonly fwIntegService: FirewallIntegrateService) {
        super();
    }

    private setOptionConflicts(optionName: string, conflicts: string[]): void {
        const option = this.command.options.find(
            (option) => option.attributeName() === optionName,
        );
        option.conflicts(conflicts);
    }

    async run(passedParam: string[], options?: CommandOptions): Promise<void> {
        if (options?.file) {
            return this.fwIntegService.integContractFile(options.file);
        }

        if (options.dir) {
            return this.fwIntegService.integContractsDir(
                options.dir,
                options.recursive,
            );
        }

        this.command.outputHelp();
    }

    @Option({
        flags: '-f, --file <string>',
        description: 'Path to contract file to customize',
    })
    parseFilePath(val: string): string {
        this.setOptionConflicts('file', ['dir']);
        return val;
    }

    @Option({
        flags: '-d, --dir <string>',
        description: 'Path to contracts directory to customize',
    })
    parseDirPath(val: string): string {
        this.setOptionConflicts('dir', ['file']);
        return dirname(val);
    }

    @Option({
        flags: '-r, --recursive',
        description: 'Recurse on all the contract files in the directory',
        defaultValue: false,
    })
    parseRecursive(): boolean {
        return true;
    }
}

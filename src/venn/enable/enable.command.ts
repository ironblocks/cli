import { CommandRunner, Option, SubCommand } from 'nest-commander';

import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { EnableService } from '@/venn/enable/enable.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/enable/enable.command.descriptor';

@SubCommand({
    name: NAME,
    description: DESCRIPTION
})
export class EnableCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly enableService: EnableService,
        private readonly filesService: FilesService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        const result = await this.enableService.enable();
        this.logger.log(`Enable command executed with result: ${result}`);
    }

    @Option({
        flags: '-c, --contracts-file <contracts-file>',
        description: 'a JSON file containing a list of contracts addresses to enable protection for',
        required: true
    })
    parseContractsFile(value: string): string | void {
        if (this.filesService.doesFileExistSync(value)) {
            return value;
        } else {
            this.command.error(`Contracts file ${value} does not exist`);
        }
    }
}

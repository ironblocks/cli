import { CommandRunner, Command } from 'nest-commander';

import { EnableCommand } from '@/venn/enable/enable.command';
import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/venn.command.descriptor';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [EnableCommand]
})
export class VennCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        this.command.help();
    }
}
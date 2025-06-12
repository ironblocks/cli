import { Command, CommandRunner } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';
import { DryRunCommand } from '@/mode/dry-run/dry-run.command';
import { LiveCommand } from '@/mode/live/live.command';
import { DESCRIPTION, FULL_NAME, NAME } from '@/mode/mode.command.descriptor';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [DryRunCommand, LiveCommand],
})
export class ModeCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(_passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

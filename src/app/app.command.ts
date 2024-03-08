import { CommandRunner, RootCommand } from 'nest-commander';

import { Logger } from '@/lib/logging/logger.service';
import { FirewallCommand } from '@/firewall/firewall.command';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, NAME, FULL_NAME } from '@/app/app.command.descriptor';

@RootCommand({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [FirewallCommand]
})
export class AppCommand extends CommandRunner {
    constructor(private readonly logger: Logger) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

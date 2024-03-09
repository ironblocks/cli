import { CommandRunner, Command } from 'nest-commander';

import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { IntegrationCommand } from '@/firewall/integration/integration.command';
import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/firewall.command.descriptor';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [IntegrationCommand]
})
export class FirewallCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

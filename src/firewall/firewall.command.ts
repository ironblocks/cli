import { Command, CommandRunner } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/firewall.command.descriptor';
import { IntegrationCommand } from '@/firewall/integration/integration.command';
import { LoggerService } from '@/lib/logging/logger.service';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [IntegrationCommand],
})
export class FirewallCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(_passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

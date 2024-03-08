import { CommandRunner, Command } from 'nest-commander';

import { Logger } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { FirewallIntegrateCommand } from '@/firewall/integrate/integrate.command';
import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/firewall.command.descriptor';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [FirewallIntegrateCommand]
})
export class FirewallCommand extends CommandRunner {
    constructor(private readonly logger: Logger) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

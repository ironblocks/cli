// 3rd party.
import { CommandRunner, Command } from 'nest-commander';
import * as colors from 'colors';
// Internal.
import { FirewallIntegrateCommand } from './integrate/integrate.command';
import { DESCRIPTION, NAME } from './firewall.command.descriptor';
import { Logger } from '../lib/logging/logger.service';

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [FirewallIntegrateCommand],
})
export class FirewallCommand extends CommandRunner {
    constructor(private readonly logger: Logger) {
        super();
    }
    async run(passedParams: string[]): Promise<void> {
        this.validateParams(passedParams);
        this.command.help();
    }

    private validateParams(params: string[]) {
        const userPassedAnInvalidCommand = params.length > 0;

        if (userPassedAnInvalidCommand) {
            this.logger.error(`Invalid command: ${params.join(' ')}`);
            this.command.error(`Run ${colors.bold.cyan('ib fw --help')} for usage information`);
        }
    }
}

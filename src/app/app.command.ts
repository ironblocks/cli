// 3rd party.
import { CommandRunner, RootCommand } from 'nest-commander';
import * as colors from 'colors';
// Internal.
import { DESCRIPTION, NAME } from './app.command.descriptor';
import { FirewallCommand } from '../firewall/firewall.command';
import { Logger } from '../lib/logging/logger.service';

@RootCommand({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [FirewallCommand]
})
export class AppCommand extends CommandRunner {
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
            this.command.error(`Run ${colors.bold.cyan('ib --help')} for usage information`);
        }
    }
}

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
        const userPassedAnInvalidCommand = passedParams.length > 0;

        if (userPassedAnInvalidCommand) {
            this.logger.error(`Invalid command: ${passedParams.join(' ')}`);

            // At this point, we want to show our custom error message
            // while still making sure the shell exits with a non-zero exit code
            this.logger.log(`Run ${colors.cyan('ib --help')} for usage information`);
            process.exitCode = 1;
        }
        else {
            // Default behavior is to show usage information
            this.command.help();
        }
    }
}

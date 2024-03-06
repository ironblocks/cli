// 3rd party.
import { CommandRunner, Help, Option, RootCommand } from 'nest-commander';
// Internal.
import { DESCRIPTION } from './app.command.descriptor';
import { FirewallCommand } from '../firewall/firewall.command';


@RootCommand({
    name: 'ib',
    description: DESCRIPTION,
    subCommands: [FirewallCommand],
})
export class AppCommand extends CommandRunner {

    // Default behavior is just to output usage information
    async run(passedParams: string[]): Promise<void> {
        this.command.help();
    }
}

// 3rd party.
import { CommandRunner, Command } from 'nest-commander';
// Internal.
import { FirewallIntegrateCommand } from './integrate/integrate.command';

@Command({
    name: 'fw',
    description: 'Firewall utilities for developers',
    subCommands: [FirewallIntegrateCommand],
})
export class FirewallCommand extends CommandRunner {
    async run(passedParams: string[]): Promise<void> {
        const [unkownCommand] = passedParams;
        if (!!unkownCommand) {
            return this.command.error(`error: uknown command '${unkownCommand}'`);
        }
        // Output information about available subcommands.
        this.command.help();
    }
}

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
    async run(): Promise<void> {
        // Output information about available subcommands.
        this.command.outputHelp();
    }
}

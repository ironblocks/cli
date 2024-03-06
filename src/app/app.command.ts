// 3rd party.
import { CommandRunner, Option, RootCommand } from 'nest-commander';
// Internal.
import { DESCRIPTION, FLAGS } from './app.command.descriptor';
import { FirewallCommand } from '../firewall/firewall.command';


@RootCommand({
    name: 'ib',
    description: DESCRIPTION,
    subCommands: [FirewallCommand],
})
export class AppCommand extends CommandRunner {
    async run(passedParams: string[]): Promise<void> {
        const [unkownCommand] = passedParams;
        if (!!unkownCommand) {
            return this.command.error(`error: uknown command '${unkownCommand}'`);
        }
        // Output information about available subcommands.
        this.command.help();
    }

    @Option(FLAGS.HELP)
    parseHelp(): boolean {
        return true;
    }
}

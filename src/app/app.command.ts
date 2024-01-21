// 3rd party.
import { CommandRunner, Option, RootCommand } from 'nest-commander';
// Internal.
import { FirewallCommand } from '../firewall/firewall.command';

const CLI_DESCRIPTION = `\
  🟧
🟧   ironblocks CLI tool
  🟧\
`;

@RootCommand({
    description: CLI_DESCRIPTION,
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

    @Option({
        flags: '-h, --help',
        description: 'display help for command',
    })
    parseHelp(): boolean {
        return true;
    }
}

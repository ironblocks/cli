import * as colors from 'colors';
import { CommandRunner, Option, Command } from 'nest-commander';

import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/enable/enable.command.descriptor';
import { EnableVennOptions, EnableVennService } from '@/venn/enable/enable.service';

@Command({
    name: NAME,
    description: DESCRIPTION
})
export class EnableVennCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly enableService: EnableVennService,
        private readonly filesService: FilesService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options: EnableVennOptions): Promise<void> {
        try {
            this.logger.log(`Starting Venn Network integration`);

            await this.enableService.enable(options);

            this.logger.win('Venn integration completed successfully!\n\n');
            this.logger.hint(`next, make sure to setup the ${colors.cyan('venn-dapp-sdk')} in your DApp`);
            this.logger.hint(` -> https://docs.venn.build/sdk/dapps`);
        } catch (error) {
            this.logger.error(`An error occurred: ${error.message}`);
            this.logger.hint('get support at: https://discord.gg/97cg6Qhg \n');
            this.command.error('');
        }
    }

    @Option({
        flags: '-n, --network <network>',
        description: 'the network where the contracts are deployed (default: holesky)',
        defaultValue: 'holesky'
    })
    parseNetwork(network: string): string {
        return network;
    }
}

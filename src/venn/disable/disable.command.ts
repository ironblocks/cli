import * as colors from 'colors';
import { CommandRunner, Option, Command } from 'nest-commander';

import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/disable/disable.command.descriptor';
import { DisableVennOptions, DisableVennService } from '@/venn/disable/disable.service';

@Command({
    name: NAME,
    description: DESCRIPTION
})
export class DisableVennCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly disableService: DisableVennService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options: DisableVennOptions): Promise<void> {
        try {
            this.logger.log(`Starting Venn Network removal`);

            await this.disableService.disable(options);

            this.logger.win('Venn integration removed successfully!\n\n');
            this.logger.hint(`next, make sure to also remove the ${colors.cyan('venn-dapp-sdk')} from your DApp`);
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

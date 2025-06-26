import { CommandRunner, Option, SubCommand } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';
import { DESCRIPTION, FULL_NAME, NAME } from '@/mode/dry-run/dry-run.command.descriptor';
import { DryRunService } from '@/mode/dry-run/dry-run.service';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';

export type DryRunModeOptions = {
    network: SupportedVennNetworks;
};

@SubCommand({
    name: NAME,
    description: DESCRIPTION,
})
export class DryRunCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly dryRunService: DryRunService,
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(_passedParams: string[], options: DryRunModeOptions): Promise<void> {
        try {
            this.logger.log('Switching to Dry-Run mode...');

            await this.dryRunService.switchToDryRun(options);

            this.logger.success('Successfully switched to Dry-Run mode');
        } catch (error) {
            this.logger.error(`An error occurred: ${error.message}`);
            this.logger.hint('get support at: https://discord.gg/97cg6Qhg \n');
            this.command.error('');
        }
    }

    @Option({
        flags: '-n, --network <network>',
        description: 'the network where the contracts are deployed',
        defaultValue: 'holesky',
    })
    parseNetwork(network: string): string {
        return network;
    }
}

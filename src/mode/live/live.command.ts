import { prompt } from 'inquirer';
import { CommandRunner, Option, SubCommand } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';
import { DESCRIPTION, FULL_NAME, NAME } from '@/mode/live/live.command.descriptor';
import { LiveService } from '@/mode/live/live.service';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';

export type LiveModeOptions = {
    network: SupportedVennNetworks;
    force: boolean;
};

@SubCommand({
    name: NAME,
    description: DESCRIPTION,
})
export class LiveCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly liveService: LiveService,
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(_passedParams: string[], options: LiveModeOptions): Promise<void> {
        try {
            if (!options.force) {
                this.logger.warn(
                    '⚠️  WARNING: Switching to Live mode will enable real-time monitoring and protection.',
                );
                this.logger.warn('This means your smart contracts will be actively monitored and protected by Venn.');

                const { confirm } = await prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Are you sure you want to switch to Live mode?',
                        default: false,
                    },
                ]);

                if (!confirm) {
                    this.logger.log('Operation cancelled by user');
                    return;
                }
            }

            this.logger.log('Switching to Live mode...');

            await this.liveService.switchToLive(options);

            this.logger.success('Successfully switched to Live mode');
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

    @Option({
        flags: '--force',
        description: 'force the switch to live mode',
        defaultValue: false,
    })
    parseForce(): boolean {
        return true;
    }
}

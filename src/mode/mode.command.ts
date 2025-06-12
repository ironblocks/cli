import * as colors from 'colors';
import { Command, CommandRunner, Option } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';
import { DryRunCommand } from '@/mode/dry-run/dry-run.command';
import { FULL_NAME as DRY_RUN_FULL_NAME } from '@/mode/dry-run/dry-run.command.descriptor';
import { LiveCommand } from '@/mode/live/live.command';
import { FULL_NAME as LIVE_FULL_NAME } from '@/mode/live/live.command.descriptor';
import { DESCRIPTION, FULL_NAME, NAME } from '@/mode/mode.command.descriptor';
import { FULL_NAME as ENABLE_FULL_NAME } from '@/venn/enable/enable.command.descriptor';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';

import { ModeService } from './mode.service';

export type ModeCommandOptions = {
    network: SupportedVennNetworks;
};

@Command({
    name: NAME,
    description: DESCRIPTION,
    subCommands: [DryRunCommand, LiveCommand],
})
export class ModeCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly modeService: ModeService,
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options: ModeCommandOptions): Promise<void> {
        try {
            this.logger.log('Getting contract modes...');
            const contracts = await this.modeService.getContractModes(options);

            const isAllContractsHaveFirewall = contracts.every(contract => contract.hasFirewall);
            const isAllContractsInDryRunMode = contracts.every(contract => contract.isDryRunEnabled);
            const isAllContractsInLiveMode = contracts.every(contract => !contract.isDryRunEnabled);

            if (isAllContractsInDryRunMode && isAllContractsHaveFirewall) {
                // Display current mode and hint
                this.logger.log(`Current mode: ${colors.cyan('Dry-Run')}`);

                this.logger.log(`Switch to Dry-Run mode using: ${DRY_RUN_FULL_NAME} --network ${options.network}`);
            } else if (isAllContractsInLiveMode && isAllContractsHaveFirewall) {
                // Display current mode and hint
                this.logger.log(`Current mode: ${colors.cyan('Live')}`);

                this.logger.log(`Switch to Live mode using: ${LIVE_FULL_NAME} --network ${options.network}`);
            } else if (isAllContractsHaveFirewall) {
                this.logger.error('Contracts are in mixed mode');
                for (const contract of contracts) {
                    this.logger.warn(
                        `Contract ${contract.name} is in ${contract.isDryRunEnabled ? 'Dry-Run' : 'Live'} mode`,
                    );
                }

                this.logger.log('To fix this, you can switch contracts to the same mode using:');
                this.logger.log(`${DRY_RUN_FULL_NAME} --network ${options.network}`);
                this.logger.log('or');
                this.logger.log(`${LIVE_FULL_NAME} --network ${options.network}`);
            } else {
                this.logger.error('Some contracts are not venn enabled');
                for (const contract of contracts) {
                    if (!contract.hasFirewall) {
                        this.logger.warn(`Contract ${contract.name} is not venn enabled`);
                    }
                }
                this.logger.log('To fix this, you can enable venn on the contracts using:');
                this.logger.log(`${ENABLE_FULL_NAME} --network ${options.network}`);
            }
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

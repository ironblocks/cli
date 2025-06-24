import { Command, CommandRunner, Option } from 'nest-commander';

import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';
import { DryRunCommand } from '@/mode/dry-run/dry-run.command';
import { LiveCommand } from '@/mode/live/live.command';
import { DESCRIPTION, FULL_NAME, NAME } from '@/mode/mode.command.descriptor';
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
    async run(_passedParams: string[], options: ModeCommandOptions): Promise<void> {
        try {
            await this.modeService.printStatuses(options);
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

import * as colors from 'colors';
import { CommandRunner, Option, Command } from 'nest-commander';

import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/init/init.command.descriptor';
import { InitVennOptions, InitVennService } from '@/venn/init/init.service';

@Command({
    name: NAME,
    description: DESCRIPTION
})
export class InitVennCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly initService: InitVennService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options: InitVennOptions): Promise<void> {
        try {
            this.logger.log(`${colors.bold('Welcome to Venn! ')}🚀\n`);
            this.logger.log(`This command will help you set up Venn for your project.\n`);

            await this.initService.init(options);

            this.logger.win('\nVenn initialization completed successfully! 🎉\n');
        } catch (error) {
            this.logger.error(`\nAn error occurred: ${error.message}`);
            this.logger.hint('Get support at: https://discord.gg/97cg6Qhg \n');
            this.command.error('');
        }
    }

    @Option({
        flags: '-f, --force',
        description: 'Overwrite existing configuration'
    })
    parseForce(): boolean {
        return true;
    }

    @Option({
        flags: '-n, --network <network>',
        description: 'Target network (default: holesky)',
        defaultValue: 'holesky'
    })
    parseNetwork(network: string): string {
        return network;
    }

    @Option({
        flags: '--no-interactive',
        description: 'Disable interactive prompts and use defaults'
    })
    parseNoInteractive(): boolean {
        return true;
    }

    @Option({
        flags: '--from-deployment',
        description: 'Auto-populate configuration from deployment artifacts'
    })
    parseFromDeployment(): boolean {
        return true;
    }
}

import { CommandRunner, SubCommand } from 'nest-commander';

import { LoggerService } from '@/lib/logging/logger.service';
import { EnableService } from '@/venn/enable/enable.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/enable/enable.command.descriptor';

@SubCommand({
    name: NAME,
    description: DESCRIPTION
})
export class EnableCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly enableService: EnableService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        const result = await this.enableService.enable();
        this.logger.log(`Enable command executed with result: ${result}`);
    }
}

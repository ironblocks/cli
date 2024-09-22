import * as colors from 'colors';
import { CommandRunner, Option, RootCommand } from 'nest-commander';

import { OPTIONS } from '@/app/app.command.options.descriptors';
import { LoggerService } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { DESCRIPTION, NAME, FULL_NAME } from '@/app/app.command.descriptor';

@RootCommand({
    name: NAME,
    description: DESCRIPTION
})
export class AppCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[], options?: any): Promise<void> {
        if (options.version) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pkg = require('../../package.json');
            this.logger.log(`Venn CLI ${colors.cyan('v' + pkg.version)}`);
        } else {
            this.command.help();
        }
    }

    @Option({
        flags: OPTIONS.VERSION.FLAGS,
        description: OPTIONS.VERSION.DESCRIPTION
    })
    parseVersion(): void {}
}

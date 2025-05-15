import * as colors from 'colors';
import { CommandRunner, Option, RootCommand } from 'nest-commander';

import { DESCRIPTION, FULL_NAME, NAME } from '@/app/app.command.descriptor';
import { OPTIONS } from '@/app/app.command.options.descriptors';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { LoggerService } from '@/lib/logging/logger.service';

@RootCommand({
    name: NAME,
    description: DESCRIPTION,
})
export class AppCommand extends CommandRunner {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async run(passedParams: string[], options?: any): Promise<void> {
        if (options.version) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const pkg = require('../../package.json');
            this.logger.log(`Venn CLI ${colors.cyan('v' + pkg.version)}`);
        } else {
            this.command.help();
        }
    }

    @Option({
        flags: OPTIONS.VERSION.FLAGS,
        description: OPTIONS.VERSION.DESCRIPTION,
    })
    parseVersion(): void {}
}

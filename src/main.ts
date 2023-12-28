#!/usr/bin/env node

// 3rd party.
import { INestApplicationContext } from '@nestjs/common';
import { CommandFactory, CommandRunner, CommandRunnerService } from 'nest-commander';
// Internal.
import { AppModule } from './app/app.module';

const CLI_DESCRIPTION = `\
  🟧
🟧   ironblocks CLI tool
  🟧\
`;

async function bootstrap() {
    const app = await CommandFactory.createWithoutRunning(AppModule);
    setRootDescription(app);
    await CommandFactory.runApplication(app);
    await app.close();
}

function setRootDescription(app: INestApplicationContext): void {
    const runner = app.get<CommandRunner>(CommandRunnerService);
    // @ts-ignore
    runner.commander.description(CLI_DESCRIPTION);
}

bootstrap();

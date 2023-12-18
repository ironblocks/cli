#!/usr/bin/env node

// 3rd party.
import { INestApplicationContext } from '@nestjs/common';
import { CommandFactory, CommandRunner, CommandRunnerService } from 'nest-commander';
// Internal.
import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await CommandFactory.createWithoutRunning(AppModule);
    setRootDescription(app);
    await CommandFactory.runApplication(app);
    await app.close();
}

function setRootDescription(app: INestApplicationContext): void {
    const ROOT_DESCRIPTION = `\
    __
 __|__|
|__|__   Welcome to Ironblocks' CLI tool
   |__|`;
    const runner = app.get<CommandRunner>(CommandRunnerService);
    // @ts-ignore
    runner.commander.description(ROOT_DESCRIPTION);
}

bootstrap();

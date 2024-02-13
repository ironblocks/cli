#!/usr/bin/env node

// 3rd party.
import { CommandFactory } from 'nest-commander';
// Internal.
import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await CommandFactory.runWithoutClosing(AppModule);
    app.enableShutdownHooks();
    await app.close();
}

bootstrap();

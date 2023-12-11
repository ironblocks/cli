// 3rd party.
import { CommandFactory } from 'nest-commander';
// Internal.
import { AppModule } from './app/app.module';

async function bootstrap() {
    await CommandFactory.run(AppModule);
}

bootstrap();

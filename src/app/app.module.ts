// 3rd party.
import { Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Internal.
import config from '../config/configuration';
import { Logger } from '../lib/logging/logger.service';
import { LoggerModule } from '../lib/logging/logger.module';
import { FirewallModule } from '../firewall/firewall.module';
import { AppCommand } from './app.command';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [config],
        }),
        LoggerModule,
        FirewallModule,
    ],
    providers: [AppCommand],
})
export class AppModule implements OnModuleDestroy {
    constructor(private readonly logger: Logger) {}

    onModuleDestroy() {
        this.logger.flushBuffered();
    }
}

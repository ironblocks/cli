// 3rd party.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Internal.
import config from '../config/configuration';
import { FirewallModule } from '../firewall/firewall.module';
import { AppCommand } from './app.command';
import { LoggerModule } from '../lib/logging/logger.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [config],
        }),
        FirewallModule,
        LoggerModule
    ],
    providers: [AppCommand],
})
export class AppModule {}

// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { FirewallCommand } from './firewall.command';
import { IntegrationModule } from './integrate/integrate.module';
import { LoggerModule } from '../lib/logging/logger.module';

@Module({
    imports: [
        IntegrationModule,
        LoggerModule
    ],
    providers: [FirewallCommand],
})
export class FirewallModule {}

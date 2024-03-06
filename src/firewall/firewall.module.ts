// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { FirewallCommand } from './firewall.command';
import { FirewallIntegrateModule } from './integrate/integrate.module';
import { LoggerModule } from '../lib/logging/logger.module';

@Module({
    imports: [
        FirewallIntegrateModule,
        LoggerModule
    ],
    providers: [FirewallCommand],
})
export class FirewallModule {}

// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { FirewallCommand } from './firewall.command';
import { FirewallIntegrateModule } from './integrate/integrate.module';

@Module({
    imports: [FirewallIntegrateModule],
    providers: [FirewallCommand],
})
export class FirewallModule {}

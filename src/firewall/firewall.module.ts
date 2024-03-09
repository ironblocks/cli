import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { FirewallCommand } from '@/firewall/firewall.command';
import { IntegrationModule } from '@/firewall/integration/integration.module';

@Module({
    imports: [IntegrationModule, LoggerModule],
    providers: [FirewallCommand]
})
export class FirewallModule {}

import { Module } from '@nestjs/common';

import { FirewallCommand } from '@/firewall/firewall.command';
import { IntegrationModule } from '@/firewall/integration/integration.module';
import { LoggerModule } from '@/lib/logging/logger.module';

@Module({
    imports: [IntegrationModule, LoggerModule],
    providers: [FirewallCommand],
})
export class FirewallModule {}

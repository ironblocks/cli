import { Module } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { FrameworkModule } from '@/framework/framework.module';
import { IntegrationService } from '@/firewall/integration/integration.service';
import { IntegrationUtils } from '@/firewall/integration/integration.utils';
import { IntegrationCommand } from '@/firewall/integration/integration.command';

@Module({
    imports: [LoggerModule, FilesModules, FrameworkModule],
    providers: [LoggerService, IntegrationCommand, IntegrationService, IntegrationUtils]
})
export class IntegrationModule {}

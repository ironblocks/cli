import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { IntegrationCommand } from '@/firewall/integration/integration.command';
import { IntegrationService } from '@/firewall/integration/integration.service';
import { IntegrationUtils } from '@/firewall/integration/integration.utils';
import { FrameworkModule } from '@/framework/framework.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { LoggerService } from '@/lib/logging/logger.service';

@Module({
    imports: [LoggerModule, FilesModules, FrameworkModule],
    providers: [LoggerService, IntegrationCommand, IntegrationService, IntegrationUtils],
})
export class IntegrationModule {}

import { Module } from '@nestjs/common';

import { Logger } from '@/lib/logging/logger.service';
import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { IntegrationService } from '@/firewall/integration/integration.service';
import { DependenciesModule } from '@/dependencies/dependencies.module';
import { IntegrationUtils } from '@/firewall/integration/integration.utils';
import { IntegrationCommand } from '@/firewall/integration/integration.command';

@Module({
    imports: [LoggerModule, DependenciesModule, FilesModules],

    providers: [Logger, IntegrationCommand, IntegrationService, IntegrationUtils]
})
export class IntegrationModule {}

import { Module } from '@nestjs/common';

import { Logger } from '@/lib/logging/logger.service';
import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { IntegrationService } from '@/firewall/integrate/integrate.service';
import { DependenciesModule } from '@/dependencies/dependencies.module';
import { FirewallIntegrateUtils } from '@/firewall/integrate/integrate.utils';
import { FirewallIntegrateCommand } from '@/firewall/integrate/integrate.command';

@Module({
    imports: [LoggerModule, DependenciesModule, FilesModules],

    providers: [Logger, FirewallIntegrateCommand, IntegrationService, FirewallIntegrateUtils]
})
export class IntegrationModule {}

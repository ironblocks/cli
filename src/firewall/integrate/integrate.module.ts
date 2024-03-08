// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { FirewallIntegrateCommand } from './integrate.command';
import { IntegrationService } from './integrate.service';
import { FirewallIntegrateUtils } from './integrate.utils';
import { LoggerModule } from '../../lib/logging/logger.module';
import { DependenciesModule } from '../../dependencies/dependencies.module';
import { FilesModules } from '../../files/files.module';

@Module({
    imports: [
        LoggerModule,
        DependenciesModule,
        FilesModules
    ],

    providers: [
        Logger,
        FirewallIntegrateCommand,
        IntegrationService,
        FirewallIntegrateUtils
    ],
})
export class IntegrationModule {}

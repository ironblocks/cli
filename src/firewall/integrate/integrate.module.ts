// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { FirewallIntegrateCommand } from './integrate.command';
import { FirewallIntegrateQuestions } from './integrate.questions';
import { IntegrationService } from './integrate.service';
import { FirewallIntegrateUtils } from './integrate.utils';
import { LoggerModule } from '../../lib/logging/logger.module';
import { DependenciesModule } from 'src/dependencies/dependencies.module';
import { DependenciesQuestions } from 'src/dependencies/dependencies.questions';

@Module({
    imports: [LoggerModule, DependenciesModule],

    providers: [
        Logger,
        FirewallIntegrateCommand,
        FirewallIntegrateQuestions,
        IntegrationService,
        FirewallIntegrateUtils
    ],
})
export class IntegrationModule {}

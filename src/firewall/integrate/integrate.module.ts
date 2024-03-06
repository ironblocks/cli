// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { FirewallIntegrateCommand } from './integrate.command';
import { FirewallIntegrateQuestions } from './integrate.questions';
import { IntegrateService } from './integrate.service';
import { FirewallIntegrateUtils } from './integrate.utils';
import { LoggerModule } from '../../lib/logging/logger.module';

@Module({
    imports: [LoggerModule],

    providers: [
        FirewallIntegrateCommand,
        FirewallIntegrateQuestions,
        IntegrateService,
        FirewallIntegrateUtils,
        Logger,
    ],
})
export class FirewallIntegrateModule {}

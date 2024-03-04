// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { LoggerModule } from '../../lib/logging/logger.module';
import { FirewallIntegrateCommand } from './integrate.command';
import { FirewallIntegrateQuestions } from './integrate.questions';
import { FirewallIntegrateService } from './integrate.service';
import { FirewallIntegrateUtils } from './integrate.utils';

@Module({
    imports: [LoggerModule],
    providers: [
        FirewallIntegrateCommand,
        FirewallIntegrateQuestions,
        FirewallIntegrateService,
        FirewallIntegrateUtils,
    ],
})
export class FirewallIntegrateModule {}

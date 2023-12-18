// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { Logger } from '../../logging/logger.service';
import { FirewallIntegrateCommand } from './integrate.command';
import { FirewallIntegrateQuestions } from './integrate.questions';
import { FirewallIntegrateService } from './integrate.service';
import { FirewallIntegrateUtils } from './integrate.utils';

@Module({
    providers: [
        FirewallIntegrateCommand,
        FirewallIntegrateQuestions,
        FirewallIntegrateService,
        FirewallIntegrateUtils,
        Logger,
    ],
})
export class FirewallIntegrateModule {}

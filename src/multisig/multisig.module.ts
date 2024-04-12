import { Module } from '@nestjs/common';
import { MultisigService } from './multisig.service';
import { LoggerModule } from '@/lib/logging/logger.module';
import { MultisigQuestions } from './multisig.questions';
import { NetworkQuestions } from './network.questions';
import { SafeService } from './safe.service';
import { NetworkService } from './network.service';

@Module({
    imports: [LoggerModule],
    providers: [MultisigService, SafeService, NetworkService, MultisigQuestions, NetworkQuestions],
    exports: [MultisigService]
})
export class MultisigModule {}

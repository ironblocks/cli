import { LoggerModule } from '@/lib/logging/logger.module';
import { NetworkQuestions } from '@/multiSig/network.questions';
import { SafeService } from '@/multiSig/safe.service';
import { MultiSigQuestions } from '@/multiSig/multiSig.questions';
import { Module } from '@nestjs/common';
import { MultiSigService } from '@/multiSig/multiSig.service';

@Module({
    imports: [LoggerModule],
    providers: [MultiSigService, SafeService, MultiSigQuestions, NetworkQuestions],
    exports: [MultiSigService]
})
export class MultiSigModule {}

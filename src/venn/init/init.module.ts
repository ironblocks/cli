import { Module } from '@nestjs/common';

import { InitVennCommand } from '@/venn/init/init.command';
import { InitVennService } from '@/venn/init/init.service';
import { FilesModules } from '@/files/files.module';
import { FrameworkModule } from '@/framework/framework.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { NetworkQuestions, ContractSelectionQuestions, PrivateKeyQuestions } from '@/venn/init/init.questions';

@Module({
    imports: [LoggerModule, FilesModules, FrameworkModule],
    providers: [InitVennCommand, InitVennService, NetworkQuestions, ContractSelectionQuestions, PrivateKeyQuestions],
    exports: []
})
export class InitModule {}

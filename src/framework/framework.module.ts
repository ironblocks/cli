import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { FoundryService } from '@/framework/foundry.service';
import { HardhatService } from '@/framework/hardhat.service';
import { FrameworkService } from '@/framework/framework.service';
import { InstallDependenciesQuestions } from '@/framework/install-dependencies.questions';

@Module({
    imports: [FilesModules, LoggerModule],
    providers: [FrameworkService, FoundryService, HardhatService, InstallDependenciesQuestions],
    exports: [FrameworkService]
})
export class FrameworkModule {}

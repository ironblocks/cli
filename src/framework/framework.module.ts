import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { DependenciesService } from '@/framework/dependencies.services';
import { ForgeStrategy } from '@/framework/forge.strategy';
import { FoundryService } from '@/framework/foundry.service';
import { FrameworkService } from '@/framework/framework.service';
import { HardhatService } from '@/framework/hardhat.service';
import { InstallDependenciesQuestions } from '@/framework/install-dependencies.questions';
import { NPMStrategy } from '@/framework/npm.strategy';
import { YarnStrategy } from '@/framework/yarn.strategy';
import { LoggerModule } from '@/lib/logging/logger.module';

import { SelectDependenciesStrategyQuestions } from './select-dependencies-strategy.questions';

@Module({
    imports: [FilesModules, LoggerModule],

    providers: [
        FrameworkService,
        FoundryService,
        HardhatService,
        InstallDependenciesQuestions,
        SelectDependenciesStrategyQuestions,
        DependenciesService,
        ForgeStrategy,
        YarnStrategy,
        NPMStrategy,
    ],

    exports: [FrameworkService],
})
export class FrameworkModule {}

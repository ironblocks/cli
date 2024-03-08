import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { ProjectInfoModule } from '@/project-info/project-info.module';
import { DependenciesService } from '@/dependencies/dependencies.service';
import { DependenciesQuestions } from '@/dependencies/dependencies.questions';

@Module({
    imports: [ProjectInfoModule, LoggerModule],
    providers: [DependenciesService, DependenciesQuestions],
    exports: [DependenciesService]
})
export class DependenciesModule {}

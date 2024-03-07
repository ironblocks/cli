import { Module } from "@nestjs/common";
import { ProjectInfoModule } from "../project-info/project-info.module";
import { DependenciesService } from "./dependencies.service";
import { LoggerModule } from "src/lib/logging/logger.module";
import { DependenciesQuestions } from "./dependencies.questions";

@Module({
    imports: [ProjectInfoModule, LoggerModule],
    providers: [DependenciesService, DependenciesQuestions],
    exports: [DependenciesService]
})
export class DependenciesModule {}
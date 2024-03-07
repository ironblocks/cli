import { Module } from "@nestjs/common";
import { LoggerModule } from "src/lib/logging/logger.module";
import { ProjectInfoService } from "./project-info.service";

@Module({
    providers: [ProjectInfoService],
    exports: [ProjectInfoService]
})
export class ProjectInfoModule {}
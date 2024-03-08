import { Module } from '@nestjs/common';

import { ProjectInfoService } from '@/project-info/project-info.service';
import { FilesModules } from '@/files/files.module';

@Module({
    imports: [FilesModules],
    providers: [ProjectInfoService],
    exports: [ProjectInfoService]
})
export class ProjectInfoModule {}

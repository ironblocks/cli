import { Module } from '@nestjs/common';

import { ProjectInfoService } from '@/project-info/project-info.service';

@Module({
    providers: [ProjectInfoService],
    exports: [ProjectInfoService]
})
export class ProjectInfoModule {}

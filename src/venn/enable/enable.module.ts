import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableService } from '@/venn/enable/enable.service';
import { EnableCommand } from '@/venn/enable/enable.command';

@Module({
    imports: [LoggerModule, FilesModules],
    providers: [EnableCommand, EnableService]
})
export class EnableModule {}

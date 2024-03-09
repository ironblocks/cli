import { Module } from '@nestjs/common';
import { FilesService } from '@/files/files.service';

@Module({
    providers: [FilesService],
    exports: [FilesService]
})
export class FilesModules {}

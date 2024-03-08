import { Module } from '@nestjs/common';
import { FilesService } from '@/files/files.services';

@Module({
    providers: [FilesService],
    exports: [FilesService]
})
export class FilesModules {}

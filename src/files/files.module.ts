import { Module } from "@nestjs/common";
import { FilesService } from "./files.services";

@Module({
    providers: [FilesService],
    exports: [FilesService],
})
export class FilesModules {}
import { Injectable } from '@nestjs/common';

import { FilesService } from '@/files/files.service';

@Injectable()
export class FoundryService {
    constructor(private readonly filesService: FilesService) {}

    public async isFoundryProject(): Promise<boolean> {
        return await this.filesService.doesFileExist('foundry.toml');
    }
}

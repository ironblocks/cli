import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';

import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';

@Injectable()
export class HardhatService {
    constructor(
        private readonly logger: LoggerService,
        private readonly inquirer: InquirerService,
        private readonly filesService: FilesService
    ) {}

    public async isHardhatProject(): Promise<boolean> {
        return (
            (await this.filesService.doesFileExist('hardhat.config.ts')) ||
            (await this.filesService.doesFileExist('hardhat.config.js'))
        );
    }
}

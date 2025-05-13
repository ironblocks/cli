import { Module } from '@nestjs/common';
import { ethers } from 'ethers';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { DisableVennCommand } from '@/venn/disable/disable.command';
import { DisableVennService } from '@/venn/disable/disable.service';

@Module({
    imports: [LoggerModule, FilesModules],
    providers: [
        DisableVennCommand,
        DisableVennService,

        {
            provide: 'ETHERS',
            useValue: ethers,
        },
    ],
})
export class DisableVennModule {}

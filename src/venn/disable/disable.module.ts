import { ethers } from 'ethers';
import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { DisableVennService } from '@/venn/disable/disable.service';
import { DisableVennCommand } from '@/venn/disable/disable.command';

@Module({
    imports: [LoggerModule, FilesModules],
    providers: [
        DisableVennCommand,
        DisableVennService,

        {
            provide: 'ETHERS',
            useValue: ethers
        }
    ]
})
export class DisableVennModule {}

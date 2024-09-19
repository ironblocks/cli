import { ethers } from 'ethers';
import { Module } from '@nestjs/common';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableVennService } from '@/venn/enable/enable.service';
import { EnableVennCommand } from '@/venn/enable/enable.command';

@Module({
    imports: [LoggerModule, FilesModules],
    providers: [
        EnableVennCommand,
        EnableVennService,

        {
            provide: 'ETHERS',
            useValue: ethers
        }
    ]
})
export class EnableVennModule {}

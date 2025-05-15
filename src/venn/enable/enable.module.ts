import { Module } from '@nestjs/common';
import { ethers } from 'ethers';

import { FilesModules } from '@/files/files.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableVennCommand } from '@/venn/enable/enable.command';
import { EnableVennService } from '@/venn/enable/enable.service';

@Module({
    imports: [LoggerModule, FilesModules],
    providers: [
        EnableVennCommand,
        EnableVennService,

        {
            provide: 'ETHERS',
            useValue: ethers,
        },
    ],
})
export class EnableVennModule {}

import { Module } from '@nestjs/common';
import { ethers } from 'ethers';

import { LoggerModule } from '@/lib/logging/logger.module';
import { LoggerService } from '@/lib/logging/logger.service';
import { LiveCommand } from '@/mode/live/live.command';
import { LiveService } from '@/mode/live/live.service';

@Module({
    imports: [LoggerModule],
    providers: [
        LoggerService,
        LiveCommand,
        LiveService,
        {
            provide: 'ETHERS',
            useValue: ethers,
        },
    ],
})
export class LiveModule {}

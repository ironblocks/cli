import { Module } from '@nestjs/common';
import { ethers } from 'ethers';

import { LoggerModule } from '@/lib/logging/logger.module';
import { LoggerService } from '@/lib/logging/logger.service';
import { DryRunModule } from '@/mode/dry-run/dry-run.module';
import { LiveModule } from '@/mode/live/live.module';
import { ModeCommand } from '@/mode/mode.command';
import { ModeService } from '@/mode/mode.service';

@Module({
    imports: [LoggerModule, DryRunModule, LiveModule],
    providers: [
        LoggerService,
        ModeService,
        ModeCommand,
        {
            provide: 'ETHERS',
            useValue: ethers,
        },
    ],
})
export class ModeModule {}

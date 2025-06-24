import { Module } from '@nestjs/common';
import { ethers } from 'ethers';

import { LoggerModule } from '@/lib/logging/logger.module';
import { LoggerService } from '@/lib/logging/logger.service';
import { DryRunCommand } from '@/mode/dry-run/dry-run.command';
import { DryRunService } from '@/mode/dry-run/dry-run.service';

@Module({
    imports: [LoggerModule],
    providers: [
        LoggerService,
        DryRunCommand,
        DryRunService,
        {
            provide: 'ETHERS',
            useValue: ethers,
        },
    ],
})
export class DryRunModule {}

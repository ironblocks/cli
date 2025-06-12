import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { DryRunModule } from '@/mode/dry-run/dry-run.module';
import { LiveModule } from '@/mode/live/live.module';
import { ModeCommand } from '@/mode/mode.command';

@Module({
    imports: [DryRunModule, LiveModule, LoggerModule],
    providers: [ModeCommand],
})
export class ModeModule {}

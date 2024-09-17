import { Module } from '@nestjs/common';

import { VennCommand } from '@/venn/venn.command';
import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableModule } from '@/venn/enable/enable.module';

@Module({
    imports: [LoggerModule, EnableModule],
    providers: [VennCommand]
})
export class VennModule {}

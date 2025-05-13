import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { DisableVennModule } from '@/venn/disable/disable.module';
import { EnableVennModule } from '@/venn/enable/enable.module';

@Module({
    imports: [EnableVennModule, DisableVennModule, LoggerModule],
})
export class VennModule {}

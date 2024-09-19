import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableVennModule } from '@/venn/enable/enable.module';
import { DisableVennModule } from '@/venn/disable/disable.module';

@Module({
    imports: [EnableVennModule, DisableVennModule, LoggerModule]
})
export class VennModule {}

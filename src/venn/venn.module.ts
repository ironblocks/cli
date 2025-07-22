import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableVennModule } from '@/venn/enable/enable.module';
import { DisableVennModule } from '@/venn/disable/disable.module';
import { InitModule } from '@/venn/init/init.module';

@Module({
    imports: [EnableVennModule, DisableVennModule, InitModule, LoggerModule]
})
export class VennModule {}

import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableVennModule } from '@/venn/enable/enable.module';
// import { EnableVennCommand } from '@/venn/enable/enable.command';

@Module({
    imports: [EnableVennModule, LoggerModule]
    // providers: [EnableVennCommand]
})
export class VennModule {}

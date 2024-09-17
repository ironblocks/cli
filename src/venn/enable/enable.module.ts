import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { EnableService } from '@/venn/enable/enable.service';
import { EnableCommand } from '@/venn/enable/enable.command';

@Module({
    imports: [LoggerModule],
    providers: [EnableCommand, EnableService]
})
export class EnableModule {}

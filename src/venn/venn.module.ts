import { Module } from '@nestjs/common';

import { LoggerModule } from '@/lib/logging/logger.module';
import { VennCommand } from '@/venn/venn.command';

@Module({
    imports: [LoggerModule],
    providers: [VennCommand]
})
export class VennModule {}

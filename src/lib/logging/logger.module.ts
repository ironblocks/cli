// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { Logger } from './logger.service';

@Module({
    providers: [Logger],
    exports: [Logger],
})
export class LoggerModule {}

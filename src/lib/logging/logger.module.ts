import { Module } from '@nestjs/common';

import { Logger } from '@/lib/logging/logger.service';

const logger = new Logger();

@Module({
    providers: [{ provide: Logger, useValue: logger }],
    exports: [{ provide: Logger, useValue: logger }]
})
export class LoggerModule {}

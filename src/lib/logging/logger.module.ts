import { Module } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';

const logger = new LoggerService();

@Module({
    providers: [{ provide: LoggerService, useValue: logger }],
    exports: [{ provide: LoggerService, useValue: logger }]
})
export class LoggerModule {}

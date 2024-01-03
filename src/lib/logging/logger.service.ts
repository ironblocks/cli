// 3rd party.
import {} from '@nestjs/common/utils';
import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class Logger extends ConsoleLogger {
    protected formatMessage(
        logLevel: LogLevel,
        message: string,
        _pidMessage: string,
        _formattedLogLevel: string,
        _contextMessage: string,
        _timestampDiff: string,
    ): string {
        message = typeof message === 'string' ? message : JSON.stringify(message);
        switch (logLevel) {
            case 'error':
                return `error: ${message}\r\n`;
            case 'warn':
                return `warning: ${message}\r\n`;
            default:
                return `${message}\r\n`;
        }
    }
}

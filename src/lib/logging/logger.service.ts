// 3rd party.
import {} from '@nestjs/common/utils';
import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

type Message = any;
type OptionalParams = [...any, string?];
type BufferedLog = [LogLevel, Message, OptionalParams];

@Injectable()
export class Logger extends ConsoleLogger {
    private _buffer: BufferedLog[];

    constructor(...args: ConstructorParameters<typeof ConsoleLogger>) {
        super(...args);
        this._buffer = [];
    }

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

    public buffer(logLevel: LogLevel, message: Message, ...optionalParams: OptionalParams): void {
        this._buffer.push([logLevel, message, optionalParams]);
    }

    public flushBuffered(): void {
        this._buffer.forEach(([logLevel, message, optionalParams]) => {
            this[logLevel](message, ...optionalParams);
        });
    }
}

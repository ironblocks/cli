import * as ora from 'ora';
import * as colors from 'colors';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsolaInstance, createConsola } from 'consola';

@Injectable()
export class LoggerService {
    private readonly logger: ConsolaInstance;

    constructor(private readonly config: ConfigService) {
        this.logger = createConsola({
            level: this.config.get<number>('logLevel')
        });
    }

    log(message: string) {
        this.logger.info(message);
    }

    error(message: string) {
        this.logger.error(`❗ ${message}`);
    }

    warn(message: string) {
        this.logger.warn(message);
    }

    debug(message: string) {
        this.logger.debug(message);
    }

    verbose(message: string) {
        this.logger.trace(message);
    }

    success(message: string) {
        this.logger.success(message);
    }

    win(message: string) {
        console.log();
        this.logger.success(`🎉 ${colors.green(message.toUpperCase())}`);
    }

    hint(message: string) {
        this.logger.info('[hint] ' + message);
    }

    step(message: string) {
        // steps are always logged with an empty line before and after
        // for better readability
        console.log();
        this.logger.info(colors.cyan('[step] ') + message);
    }

    spinner(message: string) {
        return ora(message).start();
    }
}

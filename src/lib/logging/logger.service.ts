import * as ora from 'ora';

import { consola } from 'consola';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
    log(message: string) {
        consola.info(message);
    }

    error(message: string) {
        consola.error(message);
    }

    warn(message: string) {
        consola.warn(message);
    }

    debug(message: string) {
        consola.debug(message);
    }

    verbose(message: string) {
        consola.trace(message);
    }

    spinner(message: string) {
        return ora(message).start();
    }
}

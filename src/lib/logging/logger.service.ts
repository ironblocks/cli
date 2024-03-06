import { Injectable } from '@nestjs/common';
import { consola } from 'consola';

@Injectable()
export class Logger {

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
}

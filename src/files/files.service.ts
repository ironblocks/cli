import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
    public async doesFileExist(filepath: string): Promise<boolean> {
        try {
            const normalizedPath = path.normalize(filepath);
            const resolvedPath = path.resolve(normalizedPath);

            await fs.access(resolvedPath, fs.constants.F_OK);
            return true;
        } catch (e) {
            return false;
        }
    }

    public async doesFileNotExist(filepath: string): Promise<boolean> {
        return (await this.doesFileExist(filepath)) === false;
    }
}

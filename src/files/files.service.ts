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

    public async getFile(filepath: string): Promise<string> {
        const normalizedPath = path.normalize(`${process.cwd()}/${filepath}`);
        const resolvedPath = path.resolve(normalizedPath);

        // Not wrapped in try/catch because we want to throw
        // the original error if it fails
        return fs.readFile(resolvedPath, { encoding: 'utf-8' });
    }

    public async appendToFile(filepath: string, content: string): Promise<void> {
        const normalizedPath = path.normalize(`${process.cwd()}/${filepath}`);
        const resolvedPath = path.resolve(normalizedPath);

        await fs.appendFile(resolvedPath, `\n${content}`, { encoding: 'utf-8' });
    }
}

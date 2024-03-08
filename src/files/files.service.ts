import * as fs from 'fs/promises';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
    async doesFileExist(filepath: string): Promise<boolean> {
        try {
            await fs.access(filepath, fs.constants.F_OK);
            return true;
        } catch (e) {
            return false;
        }
    }
}

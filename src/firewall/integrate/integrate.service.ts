// 3rd party.
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirewallIntegrateService {
    constructor() {}

    public async integContractFile(filePath: string): Promise<void> {
        console.log('Integ file', filePath);
    }

    public async integContractsDir(
        dirPath: string,
        recursive: boolean,
    ): Promise<void> {
        console.log('Integ dir', dirPath, recursive);
    }
}

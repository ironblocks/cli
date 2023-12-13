// Builtin.
import { dirname } from 'path';
// 3rd party.
import { Injectable } from '@nestjs/common';
// Internal.
import { FirewallIntegrateUtils } from './integrate.utils';

@Injectable()
export class FirewallIntegrateService {
    constructor(private readonly fwIntegUtils: FirewallIntegrateUtils) {}

    public async integContractFile(filepath: string): Promise<void> {
        await this.fwIntegUtils.assertFileExists(filepath);
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirname(filepath));
        console.log(`Integ file: ${filepath}`);
    }

    public async integContractsDir(dirpath: string, recursive: boolean): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirpath);
        console.log(`Integ dir: ${dirpath}, rec: ${recursive}`);
    }
}

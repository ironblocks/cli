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
        this.fwIntegUtils.assertSolidityFile(filepath);
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirname(filepath));
        await this.fwIntegUtils.customizeContractFile(filepath);
        console.log(`Customized file '${filepath}'`);
    }

    public async integContractsDir(dirpath: string, recursive: boolean): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);
        const files = await this.fwIntegUtils.getSolidityFilesInDir(dirpath, recursive);
        if (!files.length) {
            throw new Error(`could not find any solidity files at '${dirpath}'`);
        }
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirpath);
        await Promise.all(
            files.map(async (filepath) => {
                await this.fwIntegUtils.customizeContractFile(filepath);
                console.log(`Customized file '${filepath}'`);
            }),
        );
    }
}

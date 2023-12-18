// Builtin.
import { dirname } from 'path';
// 3rd party.
import { Injectable } from '@nestjs/common';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { FirewallIntegrateUtils } from './integrate.utils';

@Injectable()
export class FirewallIntegrateService {
    constructor(
        private readonly fwIntegUtils: FirewallIntegrateUtils,
        private readonly logger: Logger,
    ) {}

    public async integContractFile(filepath: string): Promise<void> {
        await this.fwIntegUtils.assertFileExists(filepath);
        this.fwIntegUtils.assertSolidityFile(filepath);
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirname(filepath));
        const customized = await this.fwIntegUtils.customizeContractFile(filepath);
        if (customized) {
            this.logger.log(`Customized file '${filepath}'`);
        } else {
            this.logger.log(`File was not changed '${filepath}'`);
        }
    }

    public async integContractsDir(dirpath: string, recursive: boolean): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);
        const files = await this.fwIntegUtils.getSolidityFilesInDir(dirpath, recursive);
        if (!files.length) {
            throw new Error(`could not find any solidity files at '${dirpath}'`);
        }
        await this.fwIntegUtils.npmInstallFirewallConsumer(dirpath);

        const customizedFiles = [];
        await Promise.all(
            files.map(async (filepath) => {
                const customized = await this.fwIntegUtils.customizeContractFile(filepath);
                if (customized && !customizedFiles.length) {
                    this.logger.log(`Customized files:\n\t${filepath}`);
                    customizedFiles.push(filepath);
                } else if (customized) {
                    this.logger.log(`\t${filepath}`);
                    customizedFiles.push(filepath);
                }
            }),
        );
        if (!customizedFiles.length) {
            this.logger.log(`No files were changed at '${dirpath}'`);
        }
    }
}

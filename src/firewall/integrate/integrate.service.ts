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
        await this.fwIntegUtils.npmInstallFirewallConsumerIfNeeded(dirname(filepath));
        const customized = await this.fwIntegUtils.customizeSolidityFile(filepath);
        if (customized) {
            this.logger.log(`Customized file '${filepath}'`);
        } else {
            this.logger.log(`File was not changed '${filepath}'`);
        }
    }

    public async integContractsDir(dirpath: string, recursive: boolean): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);

        let foundAnySolidityFiles: boolean = false;
        const customizedFiles = [];

        await this.fwIntegUtils.forEachSolidityFilesInDir(
            async (filepath) => {
                if (!foundAnySolidityFiles) {
                    foundAnySolidityFiles = true;
                    await this.fwIntegUtils.npmInstallFirewallConsumerIfNeeded(dirpath);
                }

                const customized = await this.fwIntegUtils.customizeSolidityFile(filepath);
                if (customized && !customizedFiles.length) {
                    this.logger.log(`Customized files:`);
                }
                if (customized) {
                    this.logger.log(`  ${filepath}`);
                    customizedFiles.push(filepath);
                }
            },
            dirpath,
            recursive,
        );

        if (!foundAnySolidityFiles) {
            throw new Error(`could not find any solidity files at '${dirpath}'`);
        }
        if (!customizedFiles.length) {
            this.logger.log(`No files were changed at '${dirpath}'`);
        }
    }
}

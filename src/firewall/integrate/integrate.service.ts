// Builtin.
import { dirname } from 'path';
// 3rd party.
import { Injectable } from '@nestjs/common';
// Internal.
import { Logger } from '../../lib/logging/logger.service';
import { FirewallIntegrateUtils, type IntegrateOptions } from './integrate.utils';
import { UnsupportedFileFormatError } from './errors/unsupported.file.format.error';
import { UnsupportedSolidityVersionError } from './errors/unsupported.solidity.version.error';

@Injectable()
export class FirewallIntegrateService {
    constructor(
        private readonly fwIntegUtils: FirewallIntegrateUtils,
        private readonly logger: Logger,
    ) {}

    public async integContractFile(filepath: string, options?: IntegrateOptions): Promise<void> {
        await this.fwIntegUtils.assertFileExists(filepath);
        this.fwIntegUtils.assertSolidityFile(filepath);
        await this.fwIntegUtils.npmInstallFirewallConsumerIfNeeded(dirname(filepath), options);

        try {
            const customized = await this.fwIntegUtils.customizeSolidityFile(filepath, options);
            if (customized) {
                this.logger.log(`Customized file '${filepath}'`);
            } else {
                this.logger.log(`File was not changed '${filepath}'`);
            }
        } catch (err) {
            if (err instanceof UnsupportedSolidityVersionError) {
                throw new Error(`unsupported solidity version '${err.version}' '${filepath}'`);
            }
            if (err instanceof UnsupportedFileFormatError) {
                throw new Error(`unsupported file format '${filepath}'`);
            }
            throw err;
        }
    }

    public async integContractsDir(
        dirpath: string,
        recursive: boolean,
        options?: IntegrateOptions,
    ): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);

        let foundAnySolidityFiles: boolean = false;
        const customizedFiles = [];
        const failedToCustomizeFiles = [];

        await this.fwIntegUtils.forEachSolidityFilesInDir(
            async (filepath) => {
                if (!foundAnySolidityFiles) {
                    foundAnySolidityFiles = true;
                    await this.fwIntegUtils.npmInstallFirewallConsumerIfNeeded(dirpath, options);
                }

                try {
                    const customized = await this.fwIntegUtils.customizeSolidityFile(
                        filepath,
                        options,
                    );
                    if (customized && !customizedFiles.length) {
                        this.logger.log(`Customized files:`);
                    }
                    if (customized) {
                        this.logger.log(`  ${filepath}`);
                        customizedFiles.push(filepath);
                    }
                } catch (err) {
                    if (
                        err instanceof UnsupportedSolidityVersionError ||
                        err instanceof UnsupportedSolidityVersionError
                    ) {
                        failedToCustomizeFiles.push(filepath);
                    } else {
                        throw err;
                    }
                }
            },
            dirpath,
            recursive,
        );

        if (failedToCustomizeFiles.length) {
            const files = failedToCustomizeFiles.join('\n  ');
            const message = `unsupported solidity version, or bad files format\n  ${files}`;
            throw new Error(message);
        }
        if (!foundAnySolidityFiles) {
            throw new Error(`could not find any solidity files at '${dirpath}'`);
        }
        if (!customizedFiles.length) {
            this.logger.log(`No files were changed at '${dirpath}'`);
        }
    }
}

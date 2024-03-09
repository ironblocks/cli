import { Injectable } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { FilesService } from '@/files/files.service';
import { IntegrationError } from '@/firewall/integration/integration.errors';
import { UnsupportedFileFormatError } from '@/firewall/integration/errors/unsupported.file.format.error';
import { UnsupportedSolidityVersionError } from '@/firewall/integration/errors/unsupported.solidity.version.error';
import { IntegrationUtils, type IntegrateOptions } from '@/firewall/integration/integration.utils';

@Injectable()
export class IntegrationService {
    constructor(
        private readonly fwIntegUtils: IntegrationUtils,
        private readonly filesServices: FilesService,
        private readonly logger: LoggerService
    ) {}

    public async integContractFile(filepath: string, options?: IntegrateOptions): Promise<void> {
        await this.validateFileExists(filepath);
        this.fwIntegUtils.assertSolidityFile(filepath);

        try {
            const customized = await this.fwIntegUtils.customizeSolidityFile(filepath, options);
            if (customized) {
                this.logger.log(`Firewall added to '${filepath}'`);
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

    public async integContractsDir(dirpath: string, recursive: boolean, options?: IntegrateOptions): Promise<void> {
        await this.fwIntegUtils.assertDirExists(dirpath);

        let foundAnySolidityFiles: boolean = false;
        const customizedFiles = [];
        const failedToCustomizeFiles = [];

        await this.fwIntegUtils.forEachSolidityFilesInDir(
            async filepath => {
                if (!foundAnySolidityFiles) {
                    foundAnySolidityFiles = true;
                }

                try {
                    const customized = await this.fwIntegUtils.customizeSolidityFile(filepath, options);
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
            recursive
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

    private async validateFileExists(filepath: string) {
        const fileExists = await this.filesServices.doesFileExist(filepath);

        if (fileExists === false) {
            throw new IntegrationError(`File does not exist '${filepath}'`);
        }
    }
}

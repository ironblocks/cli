import { exec } from 'child_process';
import { promisify } from 'util';

import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';

import { Dependency } from '@/framework/dependency.type';
import { FilesService } from '@/files/files.service';
import { DEPENDENCIES } from '@/framework/foundry-dependencies.constants';
import { LoggerService } from '@/lib/logging/logger.service';
import { FrameworkError } from '@/framework/framework.errors';
import { QUESTION_SET_NAME } from '@/framework/install-dependencies.questions.descriptor';
import { InstallDependenciesAnswers } from '@/framework/install-dependencies.questions';

const execAsync = promisify(exec);

@Injectable()
export class FoundryService {
    constructor(
        private readonly logger: LoggerService,
        private readonly inquirer: InquirerService,
        private readonly filesService: FilesService
    ) {}

    public async isFoundryProject(): Promise<boolean> {
        return await this.filesService.doesFileExist('foundry.toml');
    }

    public async assertDependencies(): Promise<void> {
        const missingDependencies = await this.getMissingDependencies();

        if (missingDependencies.length > 0) {
            const installApproved = await this.promptToInstallDependencies();

            if (installApproved) {
                await this.installDependencies(missingDependencies);
            } else {
                throw new FrameworkError('Cannot continue without dependencies');
            }
        }
    }

    private async getMissingDependencies(): Promise<Dependency[]> {
        const missingDependencies = [];

        for (const dependency of DEPENDENCIES) {
            const isInstalled = await this.isDependencyInstalled(dependency);

            if (!isInstalled) {
                missingDependencies.push(dependency);
            }
        }

        return missingDependencies;
    }

    private async isDependencyInstalled(dependency: Dependency): Promise<boolean> {
        const missingGitModulesFile = await this.filesService.doesFileNotExist('.gitmodules');
        if (missingGitModulesFile) {
            return false;
        } else {
            try {
                await execAsync(`grep -F -- "${dependency.installName}" .gitmodules`, { encoding: 'utf-8' });
                return true;
            } catch (e) {
                // grep error codes
                // 1: No match was found
                // 2: A file error occurred
                switch (e.code) {
                    case 1:
                        return false;
                    default:
                        throw new FrameworkError(
                            `Could not search for dependency "${dependency.name}" in .gitmodules file`
                        );
                }
            }
        }
    }

    private async promptToInstallDependencies(): Promise<boolean> {
        // prettier-ignore
        const { installDependencies } = await this.inquirer.ask<InstallDependenciesAnswers>(QUESTION_SET_NAME, {});
        return installDependencies;
    }

    private async installDependencies(dependencies: Dependency[]): Promise<void> {
        for (const dependency of dependencies) {
            await this.installDependency(dependency);
        }
    }

    private async installDependency(dependency: Dependency): Promise<void> {
        const spinner = this.logger.spinner(`Installing "${dependency.name}"`);

        try {
            await execAsync(`forge install "${dependency.installName}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed "${dependency.name}"`);
        } catch (e) {
            spinner.fail(`Failed to install "${dependency.name}"`);

            // TODO: Handle "unclean repo error" from "forge install"
            throw new FrameworkError(`Could not install dependency: ${dependency.name}.\n${e.message}`);
        }
    }
}

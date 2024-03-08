import * as colors from 'colors';
import * as ora from 'ora';

import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';

import { Logger } from '@/lib/logging/logger.service';
import { ProjectInfoService } from '@/project-info/project-info.service';
import { DependencyError } from '@/dependencies/dependencies.errors';
import {
    FOUNDRY_DEPENDENCIES,
    FOUNDRY_DEPENDENCIES_INSTALL_COMMAND,
    FOUNDRY_DEPENDENCIES_LIST_COMMAND,
    HARDHAT_DEPENDENCIES,
    HARDHAT_DEPENDENCIES_INSTALL_COMMAND,
    HARDHAT_DEPENDENCIES_LIST_COMMAND
} from '@/dependencies/dependencies.constants';

const execAsync = promisify(exec);

@Injectable()
export class DependenciesService {
    constructor(
        private readonly logger: Logger,
        private readonly projectInfoService: ProjectInfoService,
        private readonly inquirer: InquirerService
    ) {}

    async assertDependencies(): Promise<void> {
        const { type } = await this.projectInfoService.getProjectInfo();
        this.logger.log(`Project type: ${colors.cyan(type)}`);

        if (type === 'foundry') {
            await this.assertFoundryDependencies();
        } else {
            await this.assertHardhatDependencies();
        }
    }

    private async assertFoundryDependencies(): Promise<void> {
        const spinner = ora('Checking dependencies').start();

        const installationSearchResults = await Promise.all(
            FOUNDRY_DEPENDENCIES.map(this.isFoundryDependencyInstalled)
        );

        const allDependenciesAreInstalled = installationSearchResults.every(Boolean);

        if (allDependenciesAreInstalled) {
            spinner.succeed('All dependencies are installed (ok to continue)');
        } else {
            spinner.warn('Missing dependencies');
            const { installDependencies } = await this.inquirer.ask('dependencies', {});

            if (installDependencies) {
                const missingDependencies = FOUNDRY_DEPENDENCIES.filter(
                    (_, index) => installationSearchResults[index] === false
                );

                await Promise.all(missingDependencies.map(this.installFoundryDependency));
            } else {
                throw new DependencyError('Cannot continue without dependencies');
            }
        }
    }

    private async assertHardhatDependencies(): Promise<void> {
        const spinner = ora('Checking dependencies').start();

        const installationSearchResults = await Promise.all(
            HARDHAT_DEPENDENCIES.map(this.isHardhadDependencyInstalled)
        );

        const allDependenciesAreInstalled = installationSearchResults.every(Boolean);

        if (allDependenciesAreInstalled) {
            spinner.succeed('All dependencies are installed (ok to continue)');
        } else {
            spinner.warn('Missing dependencies');
            const { installDependencies } = await this.inquirer.ask('dependencies', {});

            if (installDependencies) {
                const missingDependencies = HARDHAT_DEPENDENCIES.filter(
                    (_, index) => installationSearchResults[index] === false
                );

                await Promise.all(missingDependencies.map(this.installHardhatDependency));
            } else {
                throw new DependencyError('Cannot continue without dependencies');
            }
        }
    }

    private async isHardhadDependencyInstalled(dependency: string): Promise<boolean> {
        try {
            await execAsync(`${HARDHAT_DEPENDENCIES_LIST_COMMAND} "${dependency}"`, { encoding: 'utf-8' });
            return true;
        } catch (e) {
            const stdout = e?.stdout?.toString();
            const exitCode = e?.code;

            const dependencyNotInstalled = exitCode === 1 && stdout?.includes('(empty)');
            if (dependencyNotInstalled) {
                return false;
            } else {
                throw new DependencyError(`Could not search for dependency: ${dependency}`);
            }
        }
    }

    private async installHardhatDependency(dependency: string): Promise<void> {
        const spinner = ora(`Installing ${dependency}`).start();

        try {
            await execAsync(`${HARDHAT_DEPENDENCIES_INSTALL_COMMAND} "${dependency}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed ${dependency}`);
        } catch (e) {
            spinner.fail(`Failed to install ${dependency}`);
            throw new DependencyError(`Could not install dependency: ${dependency}`);
        }
    }

    private async isFoundryDependencyInstalled(dependency: string): Promise<boolean> {
        try {
            await execAsync(`${FOUNDRY_DEPENDENCIES_LIST_COMMAND} "${dependency}"`, { encoding: 'utf-8' });
            return true;
        } catch (e) {
            const stdout = e?.stdout?.toString();
            const exitCode = e?.code;

            const dependencyNotInstalled = exitCode === 1 && stdout?.trim() === '';
            if (dependencyNotInstalled) {
                return false;
            } else {
                throw new DependencyError(`Could not search for dependency: ${dependency}`);
            }
        }
    }

    private async installFoundryDependency(dependency: string): Promise<void> {
        const spinner = ora(`Installing ${dependency}`).start();

        try {
            await execAsync(`${FOUNDRY_DEPENDENCIES_INSTALL_COMMAND} "${dependency}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed ${dependency}`);
        } catch (e) {
            spinner.fail(`Failed to install ${dependency}`);
            throw new DependencyError(`Could not install dependency: ${dependency}`);
        }
    }
}

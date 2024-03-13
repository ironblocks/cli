import * as colors from 'colors';
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';

import { IStrategy } from '@/framework/strategy.interface';
import { Dependency } from '@/framework/dependency.type';
import { NPMStrategy } from '@/framework/npm.strategy';
import { YarnStrategy } from '@/framework/yarn.strategy';
import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { ForgeStrategy } from '@/framework/forge.strategy';
import { DependenciesError } from '@/framework/dependencies.errors';
import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';
import { InstallDependenciesAnswers } from '@/framework/install-dependencies.questions';
import { SelectDependenciesStrategyAnswers } from '@/framework/select-dependencies-strategy.questions';
import { SELECT_STRATEGY_QUESTION_SET_NAME } from '@/framework/select-dependencies-strategy.questions.descriptor';
import { INSTALL_DEPENDENCIES_QUESTION_SET_NAME } from '@/framework/install-dependencies.questions.descriptor';

@Injectable()
export class DependenciesService {
    public strategyType: DependenciesStrategy;
    public strategy: IStrategy;

    constructor(
        private readonly logger: LoggerService,
        private readonly inquirer: InquirerService,
        private readonly npmStrategy: NPMStrategy,
        private readonly yarnStrategy: YarnStrategy,
        private readonly filesService: FilesService,
        private readonly forgeStrategy: ForgeStrategy
    ) {}

    public async assertDependencies(): Promise<void> {
        await this.autoSetDependenciesStrategy();

        const missingDependencies = await this.getMissingDependencies();

        if (missingDependencies.length > 0) {
            const installApproved = await this.promptToInstallDependencies();

            if (installApproved) {
                await this.installDependencies(missingDependencies);
            } else {
                throw new DependenciesError('Cannot continue without dependencies');
            }
        }
    }

    public async autoSetDependenciesStrategy(): Promise<void> {
        this.strategyType = await this.detectDependenciesStrategy();

        if (this.strategyType === DependenciesStrategy.Other) {
            throw new DependenciesError('Cannot install dependencies, unknown dependencies tool (quitting)');
        }

        this.logger.log(`Using ${colors.cyan(this.strategyType)} for dependencies management`);

        if (this.strategyType === DependenciesStrategy.Forge) {
            this.strategy = this.forgeStrategy;
        } else if (this.strategyType === DependenciesStrategy.Yarn) {
            this.strategy = this.yarnStrategy;
        } else if (this.strategyType === DependenciesStrategy.NPM) {
            this.strategy = this.npmStrategy;
        }
    }

    public async detectDependenciesStrategy(): Promise<DependenciesStrategy> {
        const usingFoundry = await this.filesService.doesFileExist('foundry.toml');
        const usingSubmodules = await this.filesService.doesFileExist('.gitmodules');
        const usingYarn = await this.filesService.doesFileExist('yarn.lock');
        const usingNPM = await this.filesService.doesFileExist('package-lock.json');

        if (usingFoundry && usingSubmodules) {
            return DependenciesStrategy.Forge;
        } else if (usingYarn) {
            return DependenciesStrategy.Yarn;
        } else if (usingNPM) {
            return DependenciesStrategy.NPM;
        } else {
            return await this.promptForStrategy();
        }
    }

    public async promptForStrategy(): Promise<DependenciesStrategy> {
        this.logger.log('Could not auto-detect dependencies management tool, please select one:');

        // prettier-ignore
        const result = await this.inquirer.ask<SelectDependenciesStrategyAnswers>(SELECT_STRATEGY_QUESTION_SET_NAME, {});
        return result.selectDependenciesStrategy;
    }

    public async getMissingDependencies(): Promise<Dependency[]> {
        const missingDependencies = [];

        for (const dependency of this.strategy.dependencies) {
            const spinner = this.logger.spinner(`Checking if "${colors.cyan(dependency.name)}" is installed`);

            const isInstalled = await this.strategy.isDependencyInstalled(dependency);

            if (!isInstalled) {
                spinner.warn(`"${colors.cyan(dependency.name)}" is missing`);
                missingDependencies.push(dependency);
            } else {
                spinner.succeed(`"${colors.cyan(dependency.name)}" is installed`);
            }
        }

        return missingDependencies;
    }

    public async promptToInstallDependencies(): Promise<boolean> {
        // prettier-ignore
        const { installDependencies } = await this.inquirer.ask<InstallDependenciesAnswers>(INSTALL_DEPENDENCIES_QUESTION_SET_NAME, {});
        return installDependencies;
    }

    public async installDependencies(dependencies: Dependency[]): Promise<void> {
        for (const dependency of dependencies) {
            await this.strategy.installDependency(dependency);
        }
    }
}

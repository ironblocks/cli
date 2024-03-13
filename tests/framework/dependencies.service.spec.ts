import * as colors from 'colors';
import { Ora } from 'ora';
import { TestBed } from '@automock/jest';

import { IStrategy } from '@/framework/strategy.interface';
import { Dependency } from '@/framework/dependency.type';
import { NPMStrategy } from '@/framework/npm.strategy';
import { LoggerService } from '@/lib/logging/logger.service';
import { YarnStrategy } from '@/framework/yarn.strategy';
import { FilesService } from '@/files/files.service';
import { ForgeStrategy } from '@/framework/forge.strategy';
import { InquirerService } from 'nest-commander';
import { DependenciesService } from '@/framework/dependencies.services';
import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';
import { SELECT_STRATEGY_QUESTION_SET_NAME } from '@/framework/select-dependencies-strategy.questions.descriptor';
import { INSTALL_DEPENDENCIES_QUESTION_SET_NAME } from '@/framework/install-dependencies.questions.descriptor';

describe('Dependencies Service', () => {
    let dependeciesService: DependenciesService;

    let loggerMock: jest.Mocked<LoggerService>;
    let inquirerMock: jest.Mocked<InquirerService>;
    let npmStrategyMock: jest.Mocked<NPMStrategy>;
    let yarnStrategyMock: jest.Mocked<YarnStrategy>;
    let filesServiceMock: jest.Mocked<FilesService>;
    let forgeStrategyMock: jest.Mocked<ForgeStrategy>;

    let mockDependency: Dependency;
    let mockStrategy: IStrategy;
    let mockSpinner: Partial<Ora>;

    beforeEach(async () => {
        const { unit, unitRef } = await TestBed.create(DependenciesService).compile();

        dependeciesService = unit;

        inquirerMock = unitRef.get(InquirerService);
        loggerMock = unitRef.get(LoggerService);
        npmStrategyMock = unitRef.get(NPMStrategy);
        yarnStrategyMock = unitRef.get(YarnStrategy);
        filesServiceMock = unitRef.get(FilesService);
        forgeStrategyMock = unitRef.get(ForgeStrategy);

        mockDependency = {
            name: 'mock-dependency',
            installName: '@mock-company/mock-dependency'
        };

        mockStrategy = {
            dependencies: [mockDependency],
            isDependencyInstalled: jest.fn(),
            installDependency: jest.fn()
        };

        mockSpinner = {
            warn: jest.fn(),
            succeed: jest.fn()
        };

        dependeciesService.strategy = mockStrategy;
        loggerMock.spinner = jest.fn().mockReturnValue(mockSpinner);
    });

    describe('.assertDependencies()', () => {
        it('auto sets the dependencies strategy', async () => {
            dependeciesService.getMissingDependencies = jest.fn().mockResolvedValue([]);
            dependeciesService.autoSetDependenciesStrategy = jest.fn();

            await dependeciesService.assertDependencies();

            expect(dependeciesService.autoSetDependenciesStrategy).toHaveBeenCalled();
        });

        it('checks for missing dependencies', async () => {
            dependeciesService.getMissingDependencies = jest.fn().mockResolvedValue([]);
            dependeciesService.autoSetDependenciesStrategy = jest.fn();

            await dependeciesService.assertDependencies();

            expect(dependeciesService.getMissingDependencies).toHaveBeenCalled();
        });

        it('prompts to install missing dependencies', async () => {
            dependeciesService.getMissingDependencies = jest.fn().mockResolvedValue([mockDependency]);
            dependeciesService.autoSetDependenciesStrategy = jest.fn();
            dependeciesService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            try {
                await dependeciesService.assertDependencies();
            } catch (e) {}

            expect(dependeciesService.promptToInstallDependencies).toHaveBeenCalled();
        });

        it('installs missing dependencies if user approves to install', async () => {
            dependeciesService.installDependencies = jest.fn();
            dependeciesService.getMissingDependencies = jest.fn().mockResolvedValue([mockDependency]);
            dependeciesService.autoSetDependenciesStrategy = jest.fn();
            dependeciesService.promptToInstallDependencies = jest.fn().mockResolvedValue(true);

            await dependeciesService.assertDependencies();

            expect(dependeciesService.installDependencies).toHaveBeenCalled();
        });

        it('throws an error if user does not approve to install', async () => {
            dependeciesService.getMissingDependencies = jest.fn().mockResolvedValue([mockDependency]);
            dependeciesService.autoSetDependenciesStrategy = jest.fn();
            dependeciesService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            await expect(dependeciesService.assertDependencies()).rejects.toThrow(
                'Cannot continue without dependencies'
            );
        });
    });

    describe('.autoSetDependenciesStrategy()', () => {
        it('detects the dependencies strategy', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn();

            await dependeciesService.autoSetDependenciesStrategy();

            expect(dependeciesService.detectDependenciesStrategy).toHaveBeenCalled();
        });

        it('throws an error if the strategy is unknown', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn().mockResolvedValue(DependenciesStrategy.Other);

            await expect(dependeciesService.autoSetDependenciesStrategy()).rejects.toThrow(
                'Cannot install dependencies, unknown dependencies tool (quitting)'
            );
        });

        it('logs the detected strategy type', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn().mockResolvedValue(DependenciesStrategy.NPM);

            await dependeciesService.autoSetDependenciesStrategy();

            expect(loggerMock.log).toHaveBeenCalledWith(
                `Using ${colors.cyan(DependenciesStrategy.NPM)} for dependencies management`
            );
        });

        it('sets the strategy to forge if detected', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn().mockResolvedValue(DependenciesStrategy.Forge);

            await dependeciesService.autoSetDependenciesStrategy();

            expect(dependeciesService.strategyType).toBe(DependenciesStrategy.Forge);
            expect(dependeciesService.strategy).toBe(forgeStrategyMock);
        });

        it('sets the strategy to yarn if detected', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn().mockResolvedValue(DependenciesStrategy.Yarn);

            await dependeciesService.autoSetDependenciesStrategy();

            expect(dependeciesService.strategyType).toBe(DependenciesStrategy.Yarn);
            expect(dependeciesService.strategy).toBe(yarnStrategyMock);
        });

        it('sets the strategy to npm if detected', async () => {
            dependeciesService.detectDependenciesStrategy = jest.fn().mockResolvedValue(DependenciesStrategy.NPM);

            await dependeciesService.autoSetDependenciesStrategy();

            expect(dependeciesService.strategyType).toBe(DependenciesStrategy.NPM);
            expect(dependeciesService.strategy).toBe(npmStrategyMock);
        });
    });

    describe('.detectDependenciesStrategy()', () => {
        it('detects when forge and git-submodules are used', async () => {
            filesServiceMock.doesFileExist = jest
                .fn()
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false);

            const strategy = await dependeciesService.detectDependenciesStrategy();

            expect(filesServiceMock.doesFileExist).toHaveBeenCalledWith('foundry.toml');
            expect(filesServiceMock.doesFileExist).toHaveBeenCalledWith('.gitmodules');
            expect(strategy).toBe(DependenciesStrategy.Forge);
        });

        it('detects when yarn is used', async () => {
            filesServiceMock.doesFileExist = jest
                .fn()
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const strategy = await dependeciesService.detectDependenciesStrategy();

            expect(filesServiceMock.doesFileExist).toHaveBeenCalledWith('yarn.lock');
            expect(strategy).toBe(DependenciesStrategy.Yarn);
        });

        it('detects when npm is used', async () => {
            filesServiceMock.doesFileExist = jest
                .fn()
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const strategy = await dependeciesService.detectDependenciesStrategy();

            expect(filesServiceMock.doesFileExist).toHaveBeenCalledWith('package-lock.json');
            expect(strategy).toBe(DependenciesStrategy.NPM);
        });

        it('prompts the user for the strategy type if no files are found', async () => {
            filesServiceMock.doesFileExist = jest.fn();
            dependeciesService.promptForStrategy = jest.fn();

            await dependeciesService.detectDependenciesStrategy();

            expect(dependeciesService.promptForStrategy).toHaveBeenCalled();
        });
    });

    describe('.promptForStrategy()', () => {
        it('logs an informative messgae to the user', async () => {
            inquirerMock.ask = jest.fn().mockResolvedValue({});

            await dependeciesService.promptForStrategy();

            expect(loggerMock.log).toHaveBeenCalledWith(
                'Could not auto-detect dependencies management tool, please select one:'
            );
        });

        it('prompts the user for the strategy type', async () => {
            inquirerMock.ask = jest.fn().mockResolvedValue({});

            await dependeciesService.promptForStrategy();

            expect(inquirerMock.ask).toHaveBeenCalledWith(SELECT_STRATEGY_QUESTION_SET_NAME, {});
        });

        it('returns the selected strategy', async () => {
            inquirerMock.ask = jest.fn().mockResolvedValue({ selectDependenciesStrategy: DependenciesStrategy.NPM });

            const strategy = await dependeciesService.promptForStrategy();

            expect(strategy).toBe(DependenciesStrategy.NPM);
        });
    });

    describe('.getMissingDependencies()', () => {
        it('does nothing if no dependencies are needed', async () => {
            dependeciesService.strategy.dependencies = [];

            const missingDependencies = await dependeciesService.getMissingDependencies();

            expect(missingDependencies).toEqual([]);
            expect(loggerMock.spinner).not.toHaveBeenCalled();
            expect(dependeciesService.strategy.isDependencyInstalled).not.toHaveBeenCalled();
        });

        it('logs the name of the dependency being checked', async () => {
            dependeciesService.strategy.isDependencyInstalled = jest.fn().mockResolvedValue(true);

            await dependeciesService.getMissingDependencies();

            expect(loggerMock.spinner).toHaveBeenCalledWith(
                `Checking if "${colors.cyan(mockDependency.name)}" is installed`
            );
        });

        it('checks if the dependency is installed', async () => {
            dependeciesService.strategy.isDependencyInstalled = jest.fn().mockResolvedValue(true);

            await dependeciesService.getMissingDependencies();

            expect(dependeciesService.strategy.isDependencyInstalled).toHaveBeenCalledWith(mockDependency);
        });

        it('logs a warnging if the dependency is missing', async () => {
            dependeciesService.strategy.isDependencyInstalled = jest.fn().mockResolvedValue(false);

            await dependeciesService.getMissingDependencies();

            expect(mockSpinner.warn).toHaveBeenCalledWith(`"${colors.cyan(mockDependency.name)}" is missing`);
        });

        it('logs a success message if the dependency is installed', async () => {
            dependeciesService.strategy.isDependencyInstalled = jest.fn().mockResolvedValue(true);

            await dependeciesService.getMissingDependencies();

            expect(mockSpinner.succeed).toHaveBeenCalledWith(`"${colors.cyan(mockDependency.name)}" is installed`);
        });

        it('returns an array of missing dependencies', async () => {
            dependeciesService.strategy.isDependencyInstalled = jest.fn().mockResolvedValue(false);

            const missingDependencies = await dependeciesService.getMissingDependencies();

            expect(missingDependencies).toEqual([mockDependency]);
        });
    });

    describe('.promptToInstallDependencies()', () => {
        it('prompts the user to install dependencies', async () => {
            inquirerMock.ask = jest.fn().mockResolvedValue({});

            await dependeciesService.promptToInstallDependencies();

            expect(inquirerMock.ask).toHaveBeenCalledWith(INSTALL_DEPENDENCIES_QUESTION_SET_NAME, {});
        });

        it('returns the user response', async () => {
            inquirerMock.ask = jest.fn().mockResolvedValue({ installDependencies: true });

            const response = await dependeciesService.promptToInstallDependencies();

            expect(response).toBe(true);
        });
    });

    describe('.installDependencies()', () => {
        it('installs each dependency', async () => {
            await dependeciesService.installDependencies([mockDependency]);

            expect(dependeciesService.strategy.installDependency).toHaveBeenCalledWith(mockDependency);
            expect(dependeciesService.strategy.installDependency).toHaveBeenCalledTimes(1);
        });
    });
});

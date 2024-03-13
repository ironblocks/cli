import * as colors from 'colors';
import { exec } from 'child_process';

import { Ora } from 'ora';
import { TestBed } from '@automock/jest';

import { Dependency } from '@/framework/dependency.type';
import { YarnStrategy } from '@/framework/yarn.strategy';
import { LoggerService } from '@/lib/logging/logger.service';
import { DependenciesError } from '@/framework/dependencies.errors';

//
// Due to how ES6 modules work, we need to mock the child_process module using jest.mock
// before any of our tests run. This is because the module is imported at the top of the
// file, and the mock needs to be in place before the module is imported.
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

describe('Yarn Strategy', () => {
    let yarnStrategy: YarnStrategy;

    let loggerMock: jest.Mocked<LoggerService>;

    let mockSpinner: Partial<Ora>;
    let mockDependency: Dependency;

    beforeEach(async () => {
        jest.clearAllMocks();

        const { unit, unitRef } = TestBed.create(YarnStrategy).compile();

        yarnStrategy = unit;
        loggerMock = unitRef.get(LoggerService);

        mockDependency = {
            name: 'mock-dependency',
            installName: '@mock-company/mock-dependency'
        };

        mockSpinner = {
            warn: jest.fn(),
            fail: jest.fn(),
            succeed: jest.fn()
        };

        loggerMock.spinner = jest.fn().mockReturnValue(mockSpinner);
    });

    describe('.isDependencyInstalled()', () => {
        it('uses "yarn why" to check if the dependency is installed', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await yarnStrategy.isDependencyInstalled(mockDependency);

            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain(`yarn why "${mockDependency.installName}"`);
        });

        it('returns true if the dependency is installed', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            const isInstalled = await yarnStrategy.isDependencyInstalled(mockDependency);

            expect(isInstalled).toBe(true);
        });

        it('returns false if the dependency is not installed', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '(empty)', stderr: '' }, null);
            });

            const isInstalled = await yarnStrategy.isDependencyInstalled(mockDependency);

            expect(isInstalled).toBe(false);
        });

        it('throws an error if an unexpected error occurs', async () => {
            let thrownError: DependenciesError;

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 2, stdout: '', stderr: '' }, null);
            });

            try {
                await yarnStrategy.isDependencyInstalled(mockDependency);
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).toBeInstanceOf(DependenciesError);
            expect(thrownError.message).toBe(`Could not check if dependency "${mockDependency.name}" is installed`);
        });
    });

    describe('.installDependency()', () => {
        it('logs a spinner while installing the dependency', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await yarnStrategy.installDependency(mockDependency);

            expect(loggerMock.spinner).toHaveBeenCalledWith(`Installing "${colors.cyan(mockDependency.name)}"`);
        });

        it('installs the dependency using "yarn add"', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await yarnStrategy.installDependency(mockDependency);

            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain(`yarn add`);
        });

        it('uses the <install-name> to install the dependency', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await yarnStrategy.installDependency(mockDependency);

            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain(mockDependency.installName);
        });

        it('logs a success message if the installation is successful', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await yarnStrategy.installDependency(mockDependency);

            expect(mockSpinner.succeed).toHaveBeenCalledWith(`Installed "${colors.cyan(mockDependency.name)}"`);
        });

        it('logs a failure message if the installation fails', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, message: 'some error message' }, null);
            });

            try {
                await yarnStrategy.installDependency(mockDependency);
            } catch (e) {}

            expect(mockSpinner.fail).toHaveBeenCalledWith(`Failed to install "${colors.cyan(mockDependency.name)}"`);
        });

        it('throws an error if the installation fails', async () => {
            let thrownError: DependenciesError;

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, message: 'some error message' }, null);
            });

            try {
                await yarnStrategy.installDependency(mockDependency);
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).toBeInstanceOf(DependenciesError);
            expect(thrownError.message).toBe(
                `Could not install dependency: ${mockDependency.name}.\nsome error message`
            );
        });
    });
});

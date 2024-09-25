import * as colors from 'colors';
import { exec } from 'child_process';

import { Ora } from 'ora';
import { TestBed } from '@automock/jest';

import { Dependency } from '@/framework/dependency.type';
import { FilesService } from '@/files/files.service';
import { ForgeStrategy } from '@/framework/forge.strategy';
import { LoggerService } from '@/lib/logging/logger.service';
import { DependenciesError } from '@/framework/dependencies.errors';

//
// Due to how ES6 modules work, we need to mock the child_process module using jest.mock
// before any of our tests run. This is because the module is imported at the top of the
// file, and the mock needs to be in place before the module is imported.
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

describe('Forge Strategy', () => {
    let forgeStrategy: ForgeStrategy;

    let loggerMock: jest.Mocked<LoggerService>;
    let filesServiceMock: jest.Mocked<FilesService>;

    let mockDependency: Dependency;
    let mockSpinner: Partial<Ora>;

    beforeEach(async () => {
        jest.clearAllMocks();

        const { unit, unitRef } = TestBed.create(ForgeStrategy).compile();

        forgeStrategy = unit;

        loggerMock = unitRef.get(LoggerService);
        filesServiceMock = unitRef.get(FilesService);

        mockDependency = {
            name: 'mock-dependency',
            installName: '@mock-company/mock-dependency',
            remappings: ['mock-remappings']
        };

        mockSpinner = {
            warn: jest.fn(),
            fail: jest.fn(),
            succeed: jest.fn()
        };

        loggerMock.spinner = jest.fn().mockReturnValue(mockSpinner);
    });

    describe('.isDependencyInstalled()', () => {
        it('returns false if .gitmodules is not found', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(true);
            filesServiceMock.getFile.mockRejectedValueOnce({ code: 'ENOENT' });

            const result = await forgeStrategy.isDependencyInstalled(mockDependency);

            expect(result).toBe(false);
            expect(filesServiceMock.doesFileNotExist).toHaveBeenCalledWith('.gitmodules');
        });

        it('returns true if the dependency is found in .gitmodules', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);
            filesServiceMock.getFile.mockResolvedValueOnce(mockDependency.remappings[0]);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            const result = await forgeStrategy.isDependencyInstalled(mockDependency);
            expect(result).toBe(true);
        });

        it('returns false if the dependency is not found in .gitmodules', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);
            filesServiceMock.getFile.mockResolvedValueOnce(mockDependency.remappings[0]);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '', stderr: '' }, null);
            });

            const result = await forgeStrategy.isDependencyInstalled(mockDependency);
            expect(result).toBe(false);
        });

        it('is case insensitive', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);
            filesServiceMock.getFile.mockResolvedValueOnce(mockDependency.remappings[0]);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '', stderr: '' }, null);
            });

            await forgeStrategy.isDependencyInstalled(mockDependency);
            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain('grep -i');
        });

        it('throws an error if an unexpected error occurs', async () => {
            let thrownError: DependenciesError;

            filesServiceMock.doesFileNotExist.mockResolvedValue(false);
            filesServiceMock.getFile.mockResolvedValueOnce(mockDependency.remappings[0]);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 2, stdout: '', stderr: '' }, null);
            });

            try {
                await forgeStrategy.isDependencyInstalled(mockDependency);
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).toBeInstanceOf(DependenciesError);
            expect(thrownError.message).toBe(`Could not search for dependency "${mockDependency.name}" in .gitmodules file`);
        });
    });

    describe('.installDependency()', () => {
        it('logs a spinner while installing the dependency', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await forgeStrategy.installDependency(mockDependency);

            expect(loggerMock.spinner).toHaveBeenCalledWith(`Installing "${colors.cyan(mockDependency.name)}"`);
        });

        it('installs the dependency using "forge install"', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await forgeStrategy.installDependency(mockDependency);

            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain(`forge install`);
        });

        it('uses the <install-name> to install the dependency', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await forgeStrategy.installDependency(mockDependency);

            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain(mockDependency.installName);
        });

        it('logs a success message if the installation is successful', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await forgeStrategy.installDependency(mockDependency);

            expect(mockSpinner.succeed).toHaveBeenCalledWith(`Installed "${colors.cyan(mockDependency.name)}"`);
        });

        it('logs a failure message if the installation fails', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, message: 'some error message' }, null);
            });

            try {
                await forgeStrategy.installDependency(mockDependency);
            } catch (e) {}

            expect(mockSpinner.fail).toHaveBeenCalledWith(`Failed to install "${colors.cyan(mockDependency.name)}"`);
        });

        it('throws an error if the installation fails', async () => {
            let thrownError: DependenciesError;

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, message: 'some error message' }, null);
            });

            try {
                await forgeStrategy.installDependency(mockDependency);
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).toBeInstanceOf(DependenciesError);
            expect(thrownError.message).toBe(`Could not install dependency: ${mockDependency.name}.\nsome error message`);
        });
    });
});

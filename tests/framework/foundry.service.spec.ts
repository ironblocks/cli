import { exec } from 'child_process';

import { TestBed } from '@automock/jest';
import { InquirerService } from 'nest-commander';

import { Dependency } from '@/framework/dependency.type';
import { DEPENDENCIES } from '@/framework/foundry-dependencies.constants';
import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { FoundryService } from '@/framework/foundry.service';
import { FrameworkError } from '@/framework/framework.errors';

//
// Due to how ES6 modules work, we need to mock the child_process module using jest.mock
// before any of our tests run. This is because the module is imported at the top of the
// file, and the mock needs to be in place before the module is imported.
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

describe('Foundry Service', () => {
    let foundryService: FoundryService;

    let filesServiceMock: jest.Mocked<FilesService>;
    let loggerServiceMock: jest.Mocked<LoggerService>;
    let inquirerServiceMock: jest.Mocked<InquirerService>;

    const mockDependency = { name: 'some dependency', installName: 'some-dependency' };

    beforeEach(() => {
        jest.clearAllMocks();

        const { unit, unitRef } = TestBed.create(FoundryService).compile();

        foundryService = unit;

        filesServiceMock = unitRef.get(FilesService);
        loggerServiceMock = unitRef.get(LoggerService);
        inquirerServiceMock = unitRef.get(InquirerService);
    });

    describe('.isFoundryProject()', () => {
        it('returns true if a foundry.toml file exists', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            const result = await foundryService.isFoundryProject();
            expect(result).toBe(true);
        });

        it('returns false if a foundry.toml file does not exist', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(false);

            const result = await foundryService.isFoundryProject();
            expect(result).toBe(false);
        });
    });

    describe('.assertDependencies()', () => {
        it('checks for missing dependencies', async () => {
            foundryService.getMissingDependencies = jest.fn().mockResolvedValue([]);

            await foundryService.assertDependencies();

            expect(foundryService.getMissingDependencies).toHaveBeenCalled();
        });

        it('prompts to install missing dependencies', async () => {
            foundryService.getMissingDependencies = jest.fn().mockResolvedValue(['some missing dependency']);
            foundryService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            try {
                await foundryService.assertDependencies();
            } catch (e) {}

            expect(foundryService.promptToInstallDependencies).toHaveBeenCalled();
        });

        it('does not prompt to install missing dependencies if there are none', async () => {
            foundryService.getMissingDependencies = jest.fn().mockResolvedValue([]);
            foundryService.promptToInstallDependencies = jest.fn();

            await foundryService.assertDependencies();

            expect(foundryService.promptToInstallDependencies).not.toHaveBeenCalled();
        });

        it('installs missing dependencies if approved', async () => {
            const missingDependencies = ['some missing dependency'];
            foundryService.getMissingDependencies = jest.fn().mockResolvedValue(missingDependencies);
            foundryService.promptToInstallDependencies = jest.fn().mockResolvedValue(true);
            foundryService.installDependencies = jest.fn();

            await foundryService.assertDependencies();

            expect(foundryService.installDependencies).toHaveBeenCalledWith(missingDependencies);
        });

        it('throws an error if missing dependencies are not installed', async () => {
            foundryService.getMissingDependencies = jest.fn().mockResolvedValue(['some missing dependency']);
            foundryService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            try {
                await foundryService.assertDependencies();
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe('Cannot continue without dependencies');
            }
        });
    });

    describe('.getMissingDependencies()', () => {
        it('returns an empty array if all dependencies are installed', async () => {
            foundryService.isDependencyInstalled = jest.fn().mockResolvedValue(true);

            const result = await foundryService.getMissingDependencies();
            expect(result).toEqual([]);
        });

        it('returns an array of any missing dependencies', async () => {
            // easiest way to empty the array
            DEPENDENCIES.length = 0;
            DEPENDENCIES.push(mockDependency);

            foundryService.isDependencyInstalled = jest.fn().mockResolvedValue(false);

            const result = await foundryService.getMissingDependencies();
            expect(result).toContain(mockDependency);
        });
    });

    describe('.isDependencyInstalled()', () => {
        it('returns true if .gitmodules is not found', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(true);

            const result = await foundryService.isDependencyInstalled(mockDependency);
            expect(result).toBe(false);
        });

        it('returns true if the dependency is found in .gitmodules', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            const result = await foundryService.isDependencyInstalled(mockDependency);
            expect(result).toBe(true);
        });

        it('returns false if the dependency is not found in .gitmodules', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '', stderr: '' }, null);
            });

            const result = await foundryService.isDependencyInstalled(mockDependency);
            expect(result).toBe(false);
        });
        
        it('is case insensitive', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '', stderr: '' }, null);
            });

            await foundryService.isDependencyInstalled(mockDependency);
            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toContain('-i');
        });

        it('throws an error if an unexpected error occurs', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 2, stdout: '', stderr: '' }, null);
            });

            try {
                await foundryService.isDependencyInstalled(mockDependency);
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe(`Could not search for dependency "${mockDependency.name}" in .gitmodules file`);
            }
        });
    });

    describe('.promptToInstallDependencies()', () => {
        it('prompts the user to install dependencies', async () => {
            inquirerServiceMock.ask = jest.fn().mockResolvedValue({ installDependencies: true });

            await foundryService.promptToInstallDependencies();
            expect(inquirerServiceMock.ask).toHaveBeenCalled();
        });

        it('returns the user response', async () => {
            inquirerServiceMock.ask.mockResolvedValue({ installDependencies: true });

            const result = await foundryService.promptToInstallDependencies();
            expect(result).toBe(true);
        });
    });

    describe('.installDependencies()', () => {
        it('installs each dependency', async () => {
            const mockDependencyList = ['a', 'b', 'c'] as unknown as Dependency[];
            foundryService.installDependency = jest.fn();

            await foundryService.installDependencies(mockDependencyList);

            expect(foundryService.installDependency).toHaveBeenCalledWith('a');
            expect(foundryService.installDependency).toHaveBeenCalledWith('b');
            expect(foundryService.installDependency).toHaveBeenCalledWith('c');
            expect(foundryService.installDependency).toHaveBeenCalledTimes(mockDependencyList.length);
        });
    });

    describe('.installDependency()', () => {
        it('installs dependencies using "forge install"', async () => {
            loggerServiceMock.spinner.mockReturnValue({ succeed: jest.fn(), fail: jest.fn() } as unknown as any);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await foundryService.installDependency(mockDependency);
            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toBe(`forge install "${mockDependency.installName}"`);
        });

        it('throws a FrameworkError if the installation fails', async () => {
            loggerServiceMock.spinner.mockReturnValue({ succeed: jest.fn(), fail: jest.fn() } as unknown as any);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ message: 'some error message' });
            });

            try {
                await foundryService.installDependency(mockDependency);
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe(`Could not install dependency: ${mockDependency.name}.\nsome error message`);
            }
        });
    });
});

import { exec } from 'child_process';

import { TestBed } from '@automock/jest';
import { InquirerService } from 'nest-commander';

import { Dependency } from '@/framework/dependency.type';
import { DEPENDENCIES } from '@/framework/hardhat-dependencies.constants';
import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { FrameworkError } from '@/framework/framework.errors';
import { HardhatService } from '@/framework/hardhat.service';

//
// Due to how ES6 modules work, we need to mock the child_process module using jest.mock
// before any of our tests run. This is because the module is imported at the top of the
// file, and the mock needs to be in place before the module is imported.
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

describe('Hardhat Service', () => {
    let hardhatService: HardhatService;

    let filesServiceMock: jest.Mocked<FilesService>;
    let loggerServiceMock: jest.Mocked<LoggerService>;
    let inquirerServiceMock: jest.Mocked<InquirerService>;

    const mockDependency = { name: 'some dependency', installName: 'some-dependency' };

    beforeEach(() => {
        jest.clearAllMocks();

        const { unit, unitRef } = TestBed.create(HardhatService).compile();

        hardhatService = unit;

        filesServiceMock = unitRef.get(FilesService);
        loggerServiceMock = unitRef.get(LoggerService);
        inquirerServiceMock = unitRef.get(InquirerService);
    });

    describe('.isHardhatProject()', () => {
        it('returns true if a hardhat config file exists', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            const result = await hardhatService.isHardhatProject();
            expect(result).toBe(true);
        });

        it('returns false if a hardhat config file does not exist', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(false);

            const result = await hardhatService.isHardhatProject();
            expect(result).toBe(false);
        });
    });

    describe('.assertDependencies()', () => {
        it('checks for missing dependencies', async () => {
            hardhatService.getMissingDependencies = jest.fn().mockResolvedValue([]);

            await hardhatService.assertDependencies();

            expect(hardhatService.getMissingDependencies).toHaveBeenCalled();
        });

        it('prompts to install missing dependencies', async () => {
            hardhatService.getMissingDependencies = jest.fn().mockResolvedValue(['some missing dependency']);
            hardhatService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            try {
                await hardhatService.assertDependencies();
            } catch (e) {}

            expect(hardhatService.promptToInstallDependencies).toHaveBeenCalled();
        });

        it('does not prompt to install missing dependencies if there are none', async () => {
            hardhatService.getMissingDependencies = jest.fn().mockResolvedValue([]);
            hardhatService.promptToInstallDependencies = jest.fn();

            await hardhatService.assertDependencies();

            expect(hardhatService.promptToInstallDependencies).not.toHaveBeenCalled();
        });

        it('installs missing dependencies if approved', async () => {
            const missingDependencies = ['some missing dependency'];
            hardhatService.getMissingDependencies = jest.fn().mockResolvedValue(missingDependencies);
            hardhatService.promptToInstallDependencies = jest.fn().mockResolvedValue(true);
            hardhatService.installDependencies = jest.fn();

            await hardhatService.assertDependencies();

            expect(hardhatService.installDependencies).toHaveBeenCalledWith(missingDependencies);
        });

        it('throws an error if missing dependencies are not installed', async () => {
            hardhatService.getMissingDependencies = jest.fn().mockResolvedValue(['some missing dependency']);
            hardhatService.promptToInstallDependencies = jest.fn().mockResolvedValue(false);

            try {
                await hardhatService.assertDependencies();
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe('Cannot continue without dependencies');
            }
        });
    });

    describe('.getMissingDependencies()', () => {
        it('returns an empty array if all dependencies are installed', async () => {
            hardhatService.isDependencyInstalled = jest.fn().mockResolvedValue(true);

            const result = await hardhatService.getMissingDependencies();
            expect(result).toEqual([]);
        });

        it('returns an array of any missing dependencies', async () => {
            // easiest way to empty the array
            DEPENDENCIES.length = 0;
            DEPENDENCIES.push(mockDependency);

            hardhatService.isDependencyInstalled = jest.fn().mockResolvedValue(false);

            const result = await hardhatService.getMissingDependencies();
            expect(result).toContain(mockDependency);
        });
    });

    describe('.isDependencyInstalled()', () => {
        it('returns true if the dependency is found using "npm ls"', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            const result = await hardhatService.isDependencyInstalled(mockDependency);
            expect(result).toBe(true);
        });

        it('returns false if the dependency is not found using "npm ls"', async () => {
            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: '(empty)', stderr: '' }, null);
            });

            const result = await hardhatService.isDependencyInstalled(mockDependency);
            expect(result).toBe(false);
        });

        it('throws an error if an unexpected error occurs', async () => {
            filesServiceMock.doesFileNotExist.mockResolvedValue(false);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ code: 1, stdout: 'some other error', stderr: '' }, null);
            });

            try {
                await hardhatService.isDependencyInstalled(mockDependency);
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe(`Could not check if dependency "${mockDependency.name}" is installed`);
            }
        });
    });

    describe('.promptToInstallDependencies()', () => {
        it('prompts the user to install dependencies', async () => {
            inquirerServiceMock.ask = jest.fn().mockResolvedValue({ installDependencies: true });

            await hardhatService.promptToInstallDependencies();
            expect(inquirerServiceMock.ask).toHaveBeenCalled();
        });

        it('returns the user response', async () => {
            inquirerServiceMock.ask.mockResolvedValue({ installDependencies: true });

            const result = await hardhatService.promptToInstallDependencies();
            expect(result).toBe(true);
        });
    });

    describe('.installDependencies()', () => {
        it('installs each dependency', async () => {
            const mockDependencyList = ['a', 'b', 'c'] as unknown as Dependency[];
            hardhatService.installDependency = jest.fn();

            await hardhatService.installDependencies(mockDependencyList);

            expect(hardhatService.installDependency).toHaveBeenCalledWith('a');
            expect(hardhatService.installDependency).toHaveBeenCalledWith('b');
            expect(hardhatService.installDependency).toHaveBeenCalledWith('c');
            expect(hardhatService.installDependency).toHaveBeenCalledTimes(mockDependencyList.length);
        });
    });

    describe('.installDependency()', () => {
        it('installs dependencies using "npm install"', async () => {
            loggerServiceMock.spinner.mockReturnValue({ succeed: jest.fn(), fail: jest.fn() } as unknown as any);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback(null, { stdout: 'some output indicating success', stderr: '' });
            });

            await hardhatService.installDependency(mockDependency);
            const executedCommand = (exec as unknown as jest.Mock).mock.calls[0][0];
            expect(executedCommand).toBe(`npm install "${mockDependency.installName}"`);
        });

        it('throws a FrameworkError if the installation fails', async () => {
            loggerServiceMock.spinner.mockReturnValue({ succeed: jest.fn(), fail: jest.fn() } as unknown as any);

            (exec as unknown as jest.Mock).mockImplementation((cmd, options, callback) => {
                callback({ message: 'some error message' });
            });

            try {
                await hardhatService.installDependency(mockDependency);
            } catch (e) {
                expect(e).toBeInstanceOf(FrameworkError);
                expect(e.message).toBe(`Could not install dependency: ${mockDependency.name}.\nsome error message`);
            }
        });
    });
});

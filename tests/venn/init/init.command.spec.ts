import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import * as fs from 'fs/promises';

import { AppModule } from '@/app/app.module';
import { DESCRIPTION } from '@/venn/init/init.command.descriptor';
import { FilesService } from '@/files/files.service';
import { FrameworkService } from '@/framework/framework.service';
import { FrameworkTypes } from '@/framework/supported-frameworks.enum';

jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('')
}));

describe('Command: init', () => {
    let commandInstance: TestingModule;
    let exitSpy: jest.SpyInstance;
    let stdoutSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;
    let filesServiceMock: jest.Mocked<FilesService>;
    let frameworkServiceMock: jest.Mocked<FrameworkService>;

    beforeEach(async () => {
        filesServiceMock = {
            doesFileExist: jest.fn().mockResolvedValue(false),
            glob: jest.fn().mockResolvedValue([]),
            getFile: jest.fn().mockResolvedValue('{}')
        } as any;

        frameworkServiceMock = {
            getFrameworkType: jest.fn().mockResolvedValue(null)
        } as any;

        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule]
        })
            .overrideProvider(FilesService)
            .useValue(filesServiceMock)
            .overrideProvider(FrameworkService)
            .useValue(frameworkServiceMock)
            .compile();

        exitSpy = jest.spyOn(process, 'exit').mockImplementation();
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
        stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
    });

    afterEach(async () => {
        exitSpy.mockRestore();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('displays help when --help flag is used', async () => {
        await CommandTestFactory.run(commandInstance, ['init', '--help']);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain(DESCRIPTION);
        expect(commandOutput).toContain('--force');
        expect(commandOutput).toContain('--network');
        expect(commandOutput).toContain('--no-interactive');
        expect(commandOutput).toContain('--from-deployment');
    });

    it('creates venn.config.json in non-interactive mode', async () => {
        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('venn.config.json'), expect.stringContaining('"networks"'), 'utf-8');

        const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
        expect(outputs).toContain('Welcome to Venn!');
        expect(outputs).toContain('VENN INITIALIZATION COMPLETED SUCCESSFULLY!');
    });

    it('creates .env file when it does not exist', async () => {
        filesServiceMock.doesFileExist.mockResolvedValue(false);

        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('.env'), expect.stringContaining('VENN_PRIVATE_KEY'), 'utf-8');
    });

    it('fails when venn.config.json already exists without --force', async () => {
        filesServiceMock.doesFileExist.mockImplementation((file: string) => {
            return Promise.resolve(file === 'venn.config.json');
        });

        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('venn.config.json already exists'));
    });

    it('overwrites config when --force flag is used', async () => {
        filesServiceMock.doesFileExist.mockImplementation((file: string) => {
            return Promise.resolve(file === 'venn.config.json');
        });

        await CommandTestFactory.run(commandInstance, ['init', '--force', '--no-interactive']);

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('venn.config.json'), expect.anything(), 'utf-8');

        const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
        expect(outputs).toContain('VENN INITIALIZATION COMPLETED SUCCESSFULLY!');
    });

    it('uses specified network', async () => {
        await CommandTestFactory.run(commandInstance, ['init', '--network', 'holesky', '--no-interactive']);

        const configCall = (fs.writeFile as jest.Mock).mock.calls.find(call => call[0].includes('venn.config.json'));
        expect(configCall).toBeDefined();
        expect(configCall[1]).toContain('"holesky"');
    });

    it('detects Hardhat projects correctly', async () => {
        frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Hardhat);
        filesServiceMock.glob.mockResolvedValue(['contracts/Token.sol']);

        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
        expect(outputs).toMatch(/Found.*hardhat.*project/);
        expect(outputs).toMatch(/Detected.*1.*Solidity contracts/);
    });

    it('detects Foundry projects correctly', async () => {
        frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Foundry);
        filesServiceMock.glob.mockResolvedValue(['src/MyContract.sol']);

        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
        expect(outputs).toMatch(/Found.*foundry.*project/);
        expect(outputs).toMatch(/Detected.*1.*Solidity contracts/);
    });

    it('handles empty projects gracefully', async () => {
        frameworkServiceMock.getFrameworkType.mockResolvedValue(null);
        filesServiceMock.glob.mockResolvedValue([]);

        await CommandTestFactory.run(commandInstance, ['init', '--no-interactive']);

        const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
        expect(outputs).toContain('No Solidity contract files found');

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('venn.config.json'), expect.anything(), 'utf-8');
    });

    it('rejects invalid commands', async () => {
        await CommandTestFactory.run(commandInstance, ['init', 'invalid-extra-param']);

        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid command'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    describe('flag parsing', () => {
        it('accepts short flags', async () => {
            await CommandTestFactory.run(commandInstance, ['init', '-f', '-n', 'holesky', '--no-interactive']);

            const configCall = (fs.writeFile as jest.Mock).mock.calls.find(call => call[0].includes('venn.config.json'));
            expect(configCall[1]).toContain('"holesky"');
        });

        it('combines multiple flags correctly', async () => {
            filesServiceMock.doesFileExist.mockImplementation((file: string) => {
                return Promise.resolve(file === 'venn.config.json');
            });

            await CommandTestFactory.run(commandInstance, ['init', '--force', '--network', 'holesky', '--no-interactive', '--from-deployment']);

            const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');
            expect(outputs).toContain('VENN INITIALIZATION COMPLETED SUCCESSFULLY!');

            const configCall = (fs.writeFile as jest.Mock).mock.calls.find(call => call[0].includes('venn.config.json'));
            expect(configCall[1]).toContain('"holesky"');
        });

        it('auto-populates addresses when --from-deployment finds deployment artifacts', async () => {
            frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Hardhat);
            filesServiceMock.glob.mockImplementation((pattern: string) => {
                if (pattern.includes('**/*.sol')) {
                    return Promise.resolve(['contracts/Token.sol', 'contracts/Vault.sol']);
                }
                if (pattern.includes('deployments/**/*.json')) {
                    return Promise.resolve(['deployments/holesky/Token.json', 'deployments/holesky/Vault.json']);
                }
                return Promise.resolve([]);
            });

            filesServiceMock.doesFileExist.mockImplementation((file: string) => {
                return Promise.resolve(['deployments', 'contracts', 'contracts/Token.sol', 'contracts/Vault.sol'].includes(file));
            });

            filesServiceMock.getFile.mockImplementation((filePath: string) => {
                if (filePath === 'deployments/holesky/Token.json') {
                    return Promise.resolve(
                        JSON.stringify({
                            address: '0x1234567890123456789012345678901234567890',
                            contractName: 'Token'
                        })
                    );
                }
                if (filePath === 'deployments/holesky/Vault.json') {
                    return Promise.resolve(
                        JSON.stringify({
                            address: '0xABCDEF1234567890123456789012345678901234',
                            contractName: 'Vault'
                        })
                    );
                }
                return Promise.resolve('{}');
            });

            await CommandTestFactory.run(commandInstance, ['init', '--from-deployment', '--no-interactive']);

            if (exitSpy.mock.calls.length > 0) {
                throw new Error(`Command exited with code ${exitSpy.mock.calls[0][0]}. stderr: ${stderrSpy.mock.calls.map(c => c[0]).join('')}`);
            }

            const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');

            expect(outputs).toContain('🚀 Processing deployment artifacts');
            expect(outputs).toContain('Perfect matches found');
            expect(outputs).toMatch(/Auto-populated:.*2.*contracts/);
            expect(outputs).toContain('VENN INITIALIZATION COMPLETED SUCCESSFULLY!');

            const configCall = (fs.writeFile as jest.Mock).mock.calls.find(call => call[0].includes('venn.config.json'));
            expect(configCall).toBeDefined();

            const configContent = configCall[1];
            expect(configContent).toContain('"Token": "0x1234567890123456789012345678901234567890"');
            expect(configContent).toContain('"Vault": "0xABCDEF1234567890123456789012345678901234"');
            expect(configContent).not.toContain('"Token": "0x..."');
            expect(configContent).not.toContain('"Vault": "0x..."');
        });

        it('handles case where --from-deployment finds no matching artifacts', async () => {
            frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Hardhat);
            filesServiceMock.glob.mockImplementation((pattern: string) => {
                if (pattern.includes('**/*.sol')) {
                    return Promise.resolve(['contracts/UndeployedContract.sol']);
                }
                if (pattern.includes('deployments/**/*.json')) {
                    return Promise.resolve(['deployments/holesky/DifferentContract.json']);
                }
                return Promise.resolve([]);
            });

            filesServiceMock.doesFileExist.mockImplementation((file: string) => {
                return Promise.resolve(['deployments', 'contracts', 'contracts/UndeployedContract.sol'].includes(file));
            });

            filesServiceMock.getFile.mockImplementation((filePath: string) => {
                if (filePath === 'deployments/holesky/DifferentContract.json') {
                    return Promise.resolve(
                        JSON.stringify({
                            address: '0x1111111111111111111111111111111111111111',
                            contractName: 'DifferentContract'
                        })
                    );
                }
                return Promise.resolve('{}');
            });

            await CommandTestFactory.run(commandInstance, ['init', '--from-deployment', '--no-interactive']);

            const outputs = stdoutSpy.mock.calls.map(call => call[0]).join('');

            expect(outputs).toContain('No deployment matches found');
            expect(outputs).toContain('Selected contracts: UndeployedContract');
            expect(outputs).toContain('Available deployments: DifferentContract');

            const configCall = (fs.writeFile as jest.Mock).mock.calls.find(call => call[0].includes('venn.config.json'));
            expect(configCall).toBeDefined();
            expect(configCall[1]).toContain('"UndeployedContract": "0x..."');
        });
    });
});

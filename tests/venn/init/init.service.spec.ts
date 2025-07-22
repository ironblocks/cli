import { TestBed } from '@automock/jest';
import { InquirerService } from 'nest-commander';

import { InitVennService, InitVennOptions, ProjectAnalysis, DeploymentArtifact } from '@/venn/init/init.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { FilesService } from '@/files/files.service';
import { FrameworkService } from '@/framework/framework.service';
import { FrameworkTypes } from '@/framework/supported-frameworks.enum';

jest.mock('fs/promises', () => ({
    writeFile: jest.fn(),
    readFile: jest.fn()
}));

describe('InitVennService', () => {
    let initService: InitVennService;
    let loggerMock: jest.Mocked<LoggerService>;
    let filesServiceMock: jest.Mocked<FilesService>;
    let frameworkServiceMock: jest.Mocked<FrameworkService>;
    let inquirerMock: jest.Mocked<InquirerService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(InitVennService).compile();

        initService = unit;
        loggerMock = unitRef.get(LoggerService);
        filesServiceMock = unitRef.get(FilesService);
        frameworkServiceMock = unitRef.get(FrameworkService);
        inquirerMock = unitRef.get(InquirerService);

        // Default mock implementations
        loggerMock.log = jest.fn();
        loggerMock.error = jest.fn();
        filesServiceMock.doesFileExist = jest.fn();
        filesServiceMock.glob = jest.fn();
        frameworkServiceMock.getFrameworkType = jest.fn();
    });

    describe('analyzeProject', () => {
        it('detects Hardhat projects correctly', async () => {
            frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Hardhat);
            filesServiceMock.glob.mockResolvedValue(['contracts/Token.sol', 'contracts/Vault.sol']);
            filesServiceMock.doesFileExist.mockImplementation(file => {
                return Promise.resolve(['venn.config.json', '.env', 'deployments'].includes(file));
            });

            const result = await initService['analyzeProject']();

            expect(result).toMatchObject({
                framework: FrameworkTypes.Hardhat,
                contractsPath: 'contracts',
                contractFiles: ['contracts/Token.sol', 'contracts/Vault.sol'],
                hasDeployments: true,
                hasConfig: true,
                hasEnvFile: true
            });
        });

        it('detects Foundry projects correctly', async () => {
            frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Foundry);
            filesServiceMock.glob.mockResolvedValue(['src/MyContract.sol']);
            filesServiceMock.doesFileExist.mockImplementation(file => {
                return Promise.resolve(['broadcast'].includes(file));
            });

            const result = await initService['analyzeProject']();

            expect(result).toMatchObject({
                framework: FrameworkTypes.Foundry,
                contractsPath: 'src',
                contractFiles: ['src/MyContract.sol'],
                hasDeployments: true,
                hasConfig: false,
                hasEnvFile: false
            });
        });

        it('filters out test and mock contracts', async () => {
            frameworkServiceMock.getFrameworkType.mockResolvedValue(FrameworkTypes.Hardhat);
            filesServiceMock.glob.mockResolvedValue(['contracts/Token.sol', 'contracts/test/TokenTest.sol', 'contracts/mocks/MockToken.sol', 'contracts/MyContract.t.sol']);

            await initService['analyzeProject']();

            expect(filesServiceMock.glob).toHaveBeenCalledWith('contracts/**/*.sol');
        });
    });

    describe('validateConfiguration', () => {
        let mockAnalysis: ProjectAnalysis;
        let mockOptions: InitVennOptions;
        let mockConfig: any;

        beforeEach(() => {
            mockAnalysis = {
                framework: FrameworkTypes.Hardhat,
                contractsPath: 'contracts',
                contractFiles: ['contracts/Token.sol'],
                hasDeployments: false,
                hasConfig: false,
                hasEnvFile: false
            };

            mockOptions = { network: 'holesky' };

            mockConfig = {
                fw: {
                    integ: {
                        include: ['contracts'],
                        exclude: ['**/test/**']
                    }
                },
                networks: {
                    holesky: {
                        contracts: {
                            Token: '0x1234567890123456789012345678901234567890'
                        }
                    }
                }
            };
        });

        it('passes validation for valid configuration', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            await expect(initService['validateConfiguration'](mockConfig, mockAnalysis, mockOptions)).resolves.not.toThrow();

            expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('Configuration validation'));
        });

        it('validates Ethereum addresses correctly', async () => {
            mockConfig.networks.holesky.contracts.Token = 'invalid-address';
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            await expect(initService['validateConfiguration'](mockConfig, mockAnalysis, mockOptions)).rejects.toThrow('Configuration validation failed');
        });

        it('accepts placeholder addresses', async () => {
            mockConfig.networks.holesky.contracts.Token = '0x...';
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            await expect(initService['validateConfiguration'](mockConfig, mockAnalysis, mockOptions)).resolves.not.toThrow();
        });

        it('validates network support', async () => {
            mockConfig.networks = { 'unsupported-network': { contracts: {} } };
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            await expect(initService['validateConfiguration'](mockConfig, mockAnalysis, mockOptions)).rejects.toThrow('not currently supported');
        });

        it('validates contract files exist', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(false);

            await expect(initService['validateConfiguration'](mockConfig, mockAnalysis, mockOptions)).rejects.toThrow('Contract files not found');
        });
    });

    describe('findDeploymentMatches', () => {
        let mockArtifacts: DeploymentArtifact[];

        beforeEach(() => {
            mockArtifacts = [
                {
                    name: 'Token',
                    address: '0x1111111111111111111111111111111111111111',
                    network: 'holesky',
                    contractPath: 'deployments/holesky/Token.json'
                },
                {
                    name: 'Token',
                    address: '0x2222222222222222222222222222222222222222',
                    network: 'mainnet',
                    contractPath: 'deployments/mainnet/Token.json'
                },
                {
                    name: 'Vault',
                    address: '0x3333333333333333333333333333333333333333',
                    network: 'holesky',
                    contractPath: 'deployments/holesky/Vault.json'
                }
            ];
        });

        it('finds perfect matches for single deployments', async () => {
            const result = initService['findDeploymentMatches'](mockArtifacts, ['contracts/Vault.sol']);

            expect(result.perfect).toHaveLength(1);
            expect(result.perfect[0]).toMatchObject({
                contractName: 'Vault',
                network: 'holesky',
                artifact: mockArtifacts[2]
            });
            expect(result.conflicts).toHaveLength(0);
        });

        it('identifies conflicts for multiple deployments', async () => {
            const result = initService['findDeploymentMatches'](mockArtifacts, ['contracts/Token.sol']);

            expect(result.perfect).toHaveLength(0);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0]).toMatchObject({
                contractName: 'Token',
                artifacts: [mockArtifacts[0], mockArtifacts[1]]
            });
        });

        it('handles contracts with no deployments', async () => {
            const result = initService['findDeploymentMatches'](mockArtifacts, ['contracts/Unused.sol']);

            expect(result.perfect).toHaveLength(0);
            expect(result.conflicts).toHaveLength(0);
        });
    });

    describe('enhanceConfigFromDeployments', () => {
        let mockConfig: any;
        let mockAnalysis: ProjectAnalysis;
        let mockOptions: InitVennOptions;
        let selectedContracts: string[];

        beforeEach(() => {
            mockConfig = {
                networks: {
                    holesky: { contracts: {} }
                }
            };

            mockAnalysis = {
                framework: FrameworkTypes.Hardhat,
                contractsPath: 'contracts',
                contractFiles: [],
                hasDeployments: true,
                hasConfig: false,
                hasEnvFile: false,
                deploymentArtifacts: [
                    {
                        name: 'Token',
                        address: '0x1234567890123456789012345678901234567890',
                        network: 'holesky',
                        contractPath: 'deployments/holesky/Token.json'
                    }
                ]
            };

            mockOptions = { fromDeployment: true, interactive: false };
            selectedContracts = ['contracts/Token.sol'];
        });

        it('auto-populates perfect matches', async () => {
            await initService['enhanceConfigFromDeployments'](mockConfig, mockAnalysis, mockOptions, selectedContracts);

            expect(mockConfig.networks.holesky.contracts.Token).toBe('0x1234567890123456789012345678901234567890');

            const logCalls = loggerMock.log.mock.calls.map(call => call[0]);
            const summaryCall = logCalls.find(call => call.includes('Auto-populated:') && call.includes('1'));
            expect(summaryCall).toBeDefined();
        });

        it('handles cases with no matches', async () => {
            selectedContracts = ['contracts/UndeployedContract.sol'];

            await initService['enhanceConfigFromDeployments'](mockConfig, mockAnalysis, mockOptions, selectedContracts);

            expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('No deployment matches found'));
        });
    });

    describe('createConfiguration', () => {
        let mockAnalysis: ProjectAnalysis;
        let mockOptions: InitVennOptions;

        beforeEach(() => {
            mockAnalysis = {
                framework: FrameworkTypes.Hardhat,
                contractsPath: 'contracts',
                contractFiles: ['contracts/Token.sol'],
                hasDeployments: false,
                hasConfig: false,
                hasEnvFile: false
            };

            mockOptions = { interactive: false, network: 'holesky' };
        });

        it('creates basic configuration structure', async () => {
            const config = await initService['createConfiguration'](mockAnalysis, mockOptions);

            expect(config).toMatchObject({
                fw: {
                    integ: {
                        include: ['contracts'],
                        exclude: ['**/test/**', '**/tests/**', '**/mocks/**', '**/*.t.sol']
                    }
                },
                networks: {
                    holesky: {
                        contracts: {
                            Token: '0x...'
                        }
                    }
                }
            });
        });

        it('uses default network when not specified', async () => {
            mockOptions.network = undefined;

            const config = await initService['createConfiguration'](mockAnalysis, mockOptions);

            expect(config.networks).toHaveProperty('holesky');
        });

        it('handles interactive mode', async () => {
            mockOptions.interactive = true;
            inquirerMock.ask.mockResolvedValue({ network: 'holesky' });

            // Mock the dynamic inquirer import
            jest.doMock('inquirer', () => ({
                default: {
                    prompt: jest.fn().mockResolvedValue({ selectedContracts: ['contracts/Token.sol'] })
                }
            }));

            const config = await initService['createConfiguration'](mockAnalysis, mockOptions);

            expect(config.networks).toHaveProperty('holesky');
        });
    });

    describe('isValidEthereumAddress', () => {
        it('validates correct Ethereum addresses', () => {
            const validAddress = '0x1234567890123456789012345678901234567890';
            expect(initService['isValidEthereumAddress'](validAddress)).toBe(true);
        });

        it('rejects invalid addresses', () => {
            expect(initService['isValidEthereumAddress']('invalid')).toBe(false);
            expect(initService['isValidEthereumAddress']('0x123')).toBe(false);
            expect(initService['isValidEthereumAddress']('1234567890123456789012345678901234567890')).toBe(false);
        });

        it('accepts mixed case addresses', () => {
            const mixedCaseAddress = '0xAbCdEf1234567890123456789012345678901234';
            expect(initService['isValidEthereumAddress'](mixedCaseAddress)).toBe(true);
        });
    });
});

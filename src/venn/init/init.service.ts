import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';
import { LoggerService } from '@/lib/logging/logger.service';
import { FilesService } from '@/files/files.service';
import { FrameworkService } from '@/framework/framework.service';
import { FrameworkTypes } from '@/framework/supported-frameworks.enum';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';
import * as colors from 'colors';
import { NetworkQuestionAnswers, ContractChoice } from '@/venn/init/init.questions';
import { NETWORK_QUESTION_SET_NAME } from '@/venn/init/init.questions.descriptor';

export interface InitVennOptions {
    force?: boolean;
    network?: string;
    interactive?: boolean;
    fromDeployment?: boolean;
}

export interface ProjectAnalysis {
    framework: FrameworkTypes | null;
    contractsPath: string | null;
    contractFiles: string[];
    hasDeployments: boolean;
    hasConfig: boolean;
    hasEnvFile: boolean;
    deploymentArtifacts?: DeploymentArtifact[];
}

export interface DeploymentArtifact {
    name: string;
    address: string;
    network: string;
    contractPath: string;
}

export interface ValidationError {
    field: string;
    message: string;
    suggestion?: string;
}

@Injectable()
export class InitVennService {
    constructor(
        private readonly logger: LoggerService,
        private readonly filesService: FilesService,
        private readonly frameworkService: FrameworkService,
        private readonly inquirer: InquirerService
    ) {}

    public async init(options: InitVennOptions): Promise<void> {
        const analysis = await this.analyzeProject();

        if (analysis.hasConfig && !options.force) {
            throw new Error('venn.config.json already exists. Use --force to overwrite.');
        }

        this.displayAnalysis(analysis);
        const config = await this.createConfiguration(analysis, options);
        await this.validateConfiguration(config, analysis, options);
        await this.writeConfiguration(config);
        await this.setupEnvironment(analysis);
        this.displayNextSteps(analysis);
    }

    private async analyzeProject(): Promise<ProjectAnalysis> {
        this.logger.log('🔍 Analyzing your project...\n');

        const framework = await this.frameworkService.getFrameworkType();
        let contractsPath = null;
        let contractFiles: string[] = [];
        let deploymentArtifacts: DeploymentArtifact[] = [];

        if (framework === FrameworkTypes.Hardhat) {
            contractsPath = 'contracts';
        } else if (framework === FrameworkTypes.Foundry) {
            contractsPath = 'src';
        } else {
            if (await this.filesService.doesFileExist('contracts')) {
                contractsPath = 'contracts';
            } else if (await this.filesService.doesFileExist('src')) {
                contractsPath = 'src';
            }
        }

        if (contractsPath) {
            contractFiles = await this.findContractFiles(contractsPath);
        }

        const hasDeployments = await this.checkForDeployments(framework);
        if (hasDeployments) {
            deploymentArtifacts = await this.parseDeploymentArtifacts(framework);
        }

        const hasConfig = await this.filesService.doesFileExist('venn.config.json');
        const hasEnvFile = await this.filesService.doesFileExist('.env');

        return {
            framework,
            contractsPath,
            contractFiles,
            hasDeployments,
            hasConfig,
            hasEnvFile,
            deploymentArtifacts
        };
    }

    private async parseDeploymentArtifacts(framework: FrameworkTypes | null): Promise<DeploymentArtifact[]> {
        const artifacts: DeploymentArtifact[] = [];

        try {
            if (framework === FrameworkTypes.Hardhat) {
                artifacts.push(...(await this.parseHardhatDeployments()));
            } else if (framework === FrameworkTypes.Foundry) {
                artifacts.push(...(await this.parseFoundryBroadcasts()));
            }
        } catch (error) {
            this.logger.debug(`Error parsing deployment artifacts: ${error.message}`);
        }

        return artifacts;
    }

    private async parseHardhatDeployments(): Promise<DeploymentArtifact[]> {
        const artifacts: DeploymentArtifact[] = [];

        try {
            const deploymentFiles = await this.filesService.glob('deployments/**/*.json');

            for (const file of deploymentFiles) {
                if (file.includes('/.chainId') || file.includes('solcInputs')) continue;

                const content = await this.filesService.getFile(file);
                const deployment = JSON.parse(content);

                if (deployment.address && deployment.contractName) {
                    const pathParts = file.split('/');
                    const network = pathParts[1]; // deployments/[network]/[contract].json

                    artifacts.push({
                        name: deployment.contractName,
                        address: deployment.address,
                        network: network,
                        contractPath: file
                    });
                }
            }
        } catch (error) {
            // Silent failure for deployment parsing
        }

        return artifacts;
    }

    private async parseFoundryBroadcasts(): Promise<DeploymentArtifact[]> {
        const artifacts: DeploymentArtifact[] = [];

        try {
            const broadcastFiles = await this.filesService.glob('broadcast/**/run-latest.json');

            for (const file of broadcastFiles) {
                const content = await this.filesService.getFile(file);
                const broadcast = JSON.parse(content);

                if (broadcast.transactions) {
                    for (const tx of broadcast.transactions) {
                        if (tx.transactionType === 'CREATE' && tx.contractName && tx.contractAddress) {
                            const pathParts = file.split('/');
                            const network = pathParts[1]; // broadcast/[network]/...

                            artifacts.push({
                                name: tx.contractName,
                                address: tx.contractAddress,
                                network: network,
                                contractPath: file
                            });
                        }
                    }
                }
            }
        } catch (error) {
            // Silent failure for broadcast parsing
        }

        return artifacts;
    }

    private async findContractFiles(contractsPath: string): Promise<string[]> {
        try {
            const files = await this.filesService.glob(`${contractsPath}/**/*.sol`);
            return files.filter(file => {
                const lowercase = file.toLowerCase();
                return (
                    !lowercase.includes('/test/') &&
                    !lowercase.includes('/tests/') &&
                    !lowercase.includes('/mock/') &&
                    !lowercase.includes('/mocks/') &&
                    !lowercase.includes('.t.sol') &&
                    !lowercase.includes('test.sol') &&
                    !lowercase.includes('mock.sol')
                );
            });
        } catch (error) {
            return [];
        }
    }

    private async checkForDeployments(framework: FrameworkTypes | null): Promise<boolean> {
        if (framework === FrameworkTypes.Hardhat) {
            return await this.filesService.doesFileExist('deployments');
        } else if (framework === FrameworkTypes.Foundry) {
            return await this.filesService.doesFileExist('broadcast');
        }
        return false;
    }

    private displayAnalysis(analysis: ProjectAnalysis): void {
        if (analysis.framework) {
            this.logger.log(`✓ Found ${colors.cyan(analysis.framework)} project`);
        }

        if (analysis.contractFiles.length > 0) {
            this.logger.log(`✓ Detected ${colors.cyan(analysis.contractFiles.length.toString())} Solidity contracts`);
        }

        if (analysis.hasDeployments) {
            this.logger.log(`✓ Found deployment artifacts`);
            if (analysis.deploymentArtifacts && analysis.deploymentArtifacts.length > 0) {
                this.logger.log(`  └─ ${colors.grey(`${analysis.deploymentArtifacts.length} deployed contracts found`)}`);
            }
        }

        this.logger.log('');
    }

    private async createConfiguration(analysis: ProjectAnalysis, options: InitVennOptions): Promise<any> {
        let network = options.network;
        let selectedContracts = analysis.contractFiles;

        if (options.interactive) {
            if (!network) {
                const networkAnswer = await this.inquirer.ask<NetworkQuestionAnswers>(NETWORK_QUESTION_SET_NAME, {});
                network = networkAnswer.network;
            }

            if (analysis.contractFiles.length > 0) {
                const contractChoices: ContractChoice[] = analysis.contractFiles.map(file => {
                    const contractName = path.basename(file, '.sol');
                    const isTestContract = file.toLowerCase().includes('test') || file.toLowerCase().includes('mock');

                    return {
                        name: `${contractName} ${isTestContract ? colors.grey('(test contract - excluded)') : ''}`,
                        value: file,
                        checked: !isTestContract
                    };
                });

                try {
                    const inquirer = await import('inquirer');
                    const contractAnswer = await inquirer.default.prompt([
                        {
                            type: 'checkbox',
                            name: 'selectedContracts',
                            message: 'Select contracts to protect with Venn:',
                            choices: contractChoices
                        }
                    ]);
                    selectedContracts = contractAnswer.selectedContracts;
                } catch (error) {
                    selectedContracts = analysis.contractFiles.filter(file => {
                        const isTestContract = file.toLowerCase().includes('test') || file.toLowerCase().includes('mock');
                        return !isTestContract;
                    });
                }
            }
        }

        network = network || 'holesky';

        const config = {
            fw: {
                integ: {
                    include: analysis.contractsPath ? [analysis.contractsPath] : ['contracts'],
                    exclude: ['**/test/**', '**/tests/**', '**/mocks/**', '**/*.t.sol']
                }
            },
            networks: {
                [network]: {
                    contracts: this.buildContractsConfig(analysis, selectedContracts, network)
                }
            }
        };

        if (options.fromDeployment && analysis.deploymentArtifacts && analysis.deploymentArtifacts.length > 0) {
            await this.enhanceConfigFromDeployments(config, analysis, options, selectedContracts);
        }

        return config;
    }

    private async enhanceConfigFromDeployments(config: any, analysis: ProjectAnalysis, options: InitVennOptions, selectedContracts: string[]): Promise<void> {
        this.logger.log('🚀 Processing deployment artifacts...\n');

        const deploymentMatches = this.findDeploymentMatches(analysis.deploymentArtifacts || [], selectedContracts);

        if (deploymentMatches.perfect.length === 0 && deploymentMatches.conflicts.length === 0) {
            this.logger.log(`${colors.yellow('⚠️')} No deployment matches found for selected contracts`);
            this.logger.log(`   Selected contracts: ${selectedContracts.map(c => path.basename(c, '.sol')).join(', ')}`);
            this.logger.log(`   Available deployments: ${analysis.deploymentArtifacts!.map(a => `${a.name} (${a.network})`).join(', ')}\n`);
            return;
        }

        // Display findings
        this.displayDeploymentMatches(deploymentMatches);

        // Handle perfect matches
        let autoPopulated = 0;
        for (const match of deploymentMatches.perfect) {
            const networkConfig = config.networks[match.network] || { contracts: {} };
            networkConfig.contracts[match.contractName] = match.artifact.address;
            config.networks[match.network] = networkConfig;
            autoPopulated++;
        }

        // Handle conflicts interactively (unless --no-interactive)
        if (options.interactive && deploymentMatches.conflicts.length > 0) {
            await this.resolveDeploymentConflicts(config, deploymentMatches.conflicts);
        } else if (deploymentMatches.conflicts.length > 0) {
            // Non-interactive mode: use most recent deployment
            for (const conflict of deploymentMatches.conflicts) {
                const mostRecent = conflict.artifacts[0]; // Assume first is most recent
                const networkConfig = config.networks[mostRecent.network] || { contracts: {} };
                networkConfig.contracts[conflict.contractName] = mostRecent.address;
                config.networks[mostRecent.network] = networkConfig;
                autoPopulated++;
            }
        }

        // Summary
        const totalContracts = selectedContracts.length;
        const remaining = totalContracts - autoPopulated;

        this.logger.log(`📊 ${colors.bold('Deployment Summary:')}`);
        if (autoPopulated > 0) {
            this.logger.log(`   ✓ Auto-populated: ${colors.green(autoPopulated.toString())} contracts`);
        }
        if (remaining > 0) {
            this.logger.log(`   📝 Manual entry needed: ${colors.yellow(remaining.toString())} contracts`);
        }
        this.logger.log('');
    }

    private findDeploymentMatches(artifacts: DeploymentArtifact[], selectedContracts: string[]) {
        const perfect: Array<{ contractName: string; network: string; artifact: DeploymentArtifact }> = [];
        const conflicts: Array<{ contractName: string; artifacts: DeploymentArtifact[] }> = [];

        for (const contractFile of selectedContracts) {
            const contractName = path.basename(contractFile, '.sol');
            const matchingArtifacts = artifacts.filter(a => a.name === contractName);

            if (matchingArtifacts.length === 0) {
                // No matches - will remain as placeholder
                continue;
            } else if (matchingArtifacts.length === 1) {
                // Perfect match
                perfect.push({
                    contractName,
                    network: matchingArtifacts[0].network,
                    artifact: matchingArtifacts[0]
                });
            } else {
                // Multiple deployments - conflict
                conflicts.push({
                    contractName,
                    artifacts: matchingArtifacts
                });
            }
        }

        return { perfect, conflicts };
    }

    private displayDeploymentMatches(matches: ReturnType<typeof this.findDeploymentMatches>): void {
        if (matches.perfect.length > 0) {
            this.logger.log(`✅ ${colors.green('Perfect matches found:')}`);
            for (const match of matches.perfect) {
                this.logger.log(`   ${colors.cyan(match.contractName)} → ${match.artifact.address} ${colors.grey(`(${match.network})`)}`);
            }
            this.logger.log('');
        }

        if (matches.conflicts.length > 0) {
            this.logger.log(`⚠️  ${colors.yellow('Multiple deployments found:')}`);
            for (const conflict of matches.conflicts) {
                this.logger.log(`   ${colors.cyan(conflict.contractName)}:`);
                conflict.artifacts.forEach((artifact, index) => {
                    this.logger.log(`     ${index + 1}. ${artifact.address} ${colors.grey(`(${artifact.network})`)}`);
                });
            }
            this.logger.log('');
        }
    }

    private async resolveDeploymentConflicts(config: any, conflicts: Array<{ contractName: string; artifacts: DeploymentArtifact[] }>): Promise<void> {
        this.logger.log(`🤔 ${colors.bold('Resolving deployment conflicts...')}\n`);

        const inquirer = await import('inquirer');

        for (const conflict of conflicts) {
            const choices = [
                ...conflict.artifacts.map(artifact => ({
                    name: `${artifact.address} (${artifact.network})`,
                    value: artifact
                })),
                {
                    name: "Skip - I'll add manually later",
                    value: null
                }
            ];

            const answer = await inquirer.default.prompt([
                {
                    type: 'list',
                    name: 'selectedArtifact',
                    message: `Which deployment of ${colors.cyan(conflict.contractName)} should I use?`,
                    choices
                }
            ]);

            if (answer.selectedArtifact) {
                const artifact = answer.selectedArtifact as DeploymentArtifact;
                const networkConfig = config.networks[artifact.network] || { contracts: {} };
                networkConfig.contracts[conflict.contractName] = artifact.address;
                config.networks[artifact.network] = networkConfig;
            }
        }
    }

    private buildContractsConfig(analysis: ProjectAnalysis, selectedContracts: string[], network: string): Record<string, string> {
        const contractsConfig: Record<string, string> = {};

        // Create base structure with placeholders
        for (const contract of selectedContracts) {
            const contractName = path.basename(contract, '.sol');
            contractsConfig[contractName] = '0x...';
        }

        // Basic artifact matching for non-enhanced mode
        if (analysis.deploymentArtifacts && analysis.deploymentArtifacts.length > 0) {
            for (const contract of selectedContracts) {
                const contractName = path.basename(contract, '.sol');
                const artifact = analysis.deploymentArtifacts.find(a => a.name === contractName && a.network === network);

                if (artifact) {
                    contractsConfig[contractName] = artifact.address;
                }
            }
        }

        return contractsConfig;
    }

    private async writeConfiguration(config: any): Promise<void> {
        const configPath = path.join(process.cwd(), 'venn.config.json');
        const configContent = JSON.stringify(config, null, 2);

        await fs.writeFile(configPath, configContent, 'utf-8');
        this.logger.log(`✓ Created ${colors.green('venn.config.json')}`);
    }

    private async setupEnvironment(analysis: ProjectAnalysis): Promise<void> {
        const envPath = path.join(process.cwd(), '.env');
        const envExample = path.join(process.cwd(), '.env.example');

        if (!analysis.hasEnvFile) {
            const envContent = '# Venn Network Configuration\nVENN_PRIVATE_KEY=your_private_key_here\n';
            await fs.writeFile(envPath, envContent, 'utf-8');
            await fs.writeFile(envExample, envContent, 'utf-8');
            this.logger.log(`✓ Created ${colors.green('.env')} and ${colors.green('.env.example')}`);
        } else {
            const envContent = await fs.readFile(envPath, 'utf-8');
            if (!envContent.includes('VENN_PRIVATE_KEY')) {
                const updatedContent = envContent + '\n# Venn Network Configuration\nVENN_PRIVATE_KEY=your_private_key_here\n';
                await fs.writeFile(envPath, updatedContent, 'utf-8');
                this.logger.log(`✓ Updated ${colors.green('.env')} with VENN_PRIVATE_KEY`);
            }
        }

        await this.updateGitignore();
    }

    private async updateGitignore(): Promise<void> {
        const gitignorePath = path.join(process.cwd(), '.gitignore');

        try {
            let content = '';
            if (await this.filesService.doesFileExist('.gitignore')) {
                content = await fs.readFile(gitignorePath, 'utf-8');
            }

            if (!content.includes('.env')) {
                const updatedContent = content + (content.endsWith('\n') ? '' : '\n') + '.env\n';
                await fs.writeFile(gitignorePath, updatedContent, 'utf-8');
                this.logger.log(`✓ Updated ${colors.green('.gitignore')}`);
            }
        } catch (error) {
            // Silent failure for .gitignore update
        }
    }

    private displayNextSteps(analysis: ProjectAnalysis): void {
        this.logger.log(`\n📋 ${colors.bold('Next steps:')}`);

        let step = 1;

        this.logger.log(`${step++}. Add your private key to ${colors.cyan('.env')} file`);

        if (analysis.contractFiles.length > 0) {
            this.logger.log(`${step++}. Run ${colors.cyan(`venn fw integ -d ${analysis.contractsPath}`)} to add Firewall protection`);
        }

        this.logger.log(`${step++}. Deploy your contracts`);
        this.logger.log(`${step++}. Update ${colors.cyan('venn.config.json')} with deployed contract addresses`);
        this.logger.log(`${step++}. Run ${colors.cyan('venn enable --network holesky')} to activate protection`);

        this.logger.log(`\n💡 ${colors.bold('Tips:')}`);
        this.logger.log(`- Run ${colors.cyan('venn status')} to check your setup (coming soon)`);
        this.logger.log(`- Visit ${colors.cyan('https://docs.venn.build')} for detailed documentation`);
    }

    private async validateConfiguration(config: any, analysis: ProjectAnalysis, options: InitVennOptions): Promise<void> {
        this.logger.log('🔍 Validating configuration...\n');
        const errors: ValidationError[] = [];

        if (!config) {
            errors.push({
                field: 'config',
                message: 'Configuration is empty or invalid'
            });
            this.throwValidationErrors(errors);
        }

        this.validateFrameworkIntegration(config, errors);
        this.validateNetworks(config, errors);
        await this.validateContractAddresses(config, errors);
        await this.validateContractFiles(analysis, errors);
        this.validateNetworkSupport(config, options, errors);

        if (errors.length > 0) {
            this.throwValidationErrors(errors);
        }

        this.logger.log(`✓ Configuration validation ${colors.green('passed')}\n`);
    }

    private validateFrameworkIntegration(config: any, errors: ValidationError[]): void {
        if (!config.fw) {
            errors.push({
                field: 'fw',
                message: 'Missing firewall integration configuration',
                suggestion: 'This should be generated automatically. Try running the command again.'
            });
            return;
        }

        if (!config.fw.integ) {
            errors.push({
                field: 'fw.integ',
                message: 'Missing firewall integration settings'
            });
            return;
        }

        if (!config.fw.integ.include || !Array.isArray(config.fw.integ.include) || config.fw.integ.include.length === 0) {
            errors.push({
                field: 'fw.integ.include',
                message: 'Must specify at least one directory to include for firewall integration',
                suggestion: 'Common values are ["contracts"] for Hardhat or ["src"] for Foundry'
            });
        }

        if (config.fw.integ.exclude && !Array.isArray(config.fw.integ.exclude)) {
            errors.push({
                field: 'fw.integ.exclude',
                message: 'Exclude patterns must be an array'
            });
        }
    }

    private validateNetworks(config: any, errors: ValidationError[]): void {
        if (!config.networks) {
            errors.push({
                field: 'networks',
                message: 'No network configuration found',
                suggestion: 'At least one network must be configured'
            });
            return;
        }

        const networkNames = Object.keys(config.networks);
        if (networkNames.length === 0) {
            errors.push({
                field: 'networks',
                message: 'At least one network must be configured',
                suggestion: 'Try using --network holesky to specify a target network'
            });
            return;
        }

        // Validate each network configuration
        for (const networkName of networkNames) {
            const networkConfig = config.networks[networkName];

            if (!networkConfig) {
                errors.push({
                    field: `networks.${networkName}`,
                    message: `Network configuration for '${networkName}' is empty`
                });
                continue;
            }

            if (!networkConfig.contracts) {
                errors.push({
                    field: `networks.${networkName}.contracts`,
                    message: `No contracts configured for network '${networkName}'`,
                    suggestion: 'Add contract addresses or use --from-deployment to auto-populate'
                });
                continue;
            }

            const contractNames = Object.keys(networkConfig.contracts);
            if (contractNames.length === 0) {
                this.logger.log(`${colors.yellow('⚠️')} No contracts configured for network '${networkName}'`);
                this.logger.log(`   You can add contract addresses later to ${colors.cyan('venn.config.json')}\n`);
            }
        }
    }

    private async validateContractAddresses(config: any, errors: ValidationError[]): Promise<void> {
        if (!config.networks) return;

        for (const [networkName, networkConfig] of Object.entries(config.networks)) {
            const typedConfig = networkConfig as any;
            if (!typedConfig.contracts) continue;

            for (const [contractName, address] of Object.entries(typedConfig.contracts)) {
                if (typeof address !== 'string') {
                    errors.push({
                        field: `networks.${networkName}.contracts.${contractName}`,
                        message: `Contract address must be a string, got ${typeof address}`
                    });
                    continue;
                }

                if (address === '0x...') {
                    continue;
                }

                if (!this.isValidEthereumAddress(address)) {
                    errors.push({
                        field: `networks.${networkName}.contracts.${contractName}`,
                        message: `Invalid Ethereum address: ${address}`,
                        suggestion: 'Ethereum addresses must be 42 characters long and start with 0x'
                    });
                }
            }
        }
    }

    private async validateContractFiles(analysis: ProjectAnalysis, errors: ValidationError[]): Promise<void> {
        if (!analysis.contractFiles || analysis.contractFiles.length === 0) {
            this.logger.log(`${colors.yellow('⚠️')} No Solidity contract files found in the project`);
            const suggestion = analysis.framework
                ? `Expected to find contracts in ${analysis.contractsPath || 'contracts/'} directory`
                : 'Make sure you are running this command in a Solidity project directory';
            this.logger.log(`   ${suggestion}`);
            this.logger.log(`   You can add contracts later and re-run ${colors.cyan('venn init --force')}\n`);
            return;
        }

        const missingFiles: string[] = [];
        for (const contractFile of analysis.contractFiles) {
            if (!(await this.filesService.doesFileExist(contractFile))) {
                missingFiles.push(contractFile);
            }
        }

        if (missingFiles.length > 0) {
            errors.push({
                field: 'contract-files',
                message: `Contract files not found: ${missingFiles.join(', ')}`,
                suggestion: 'These files may have been moved or deleted since analysis'
            });
        }
    }

    private validateNetworkSupport(config: any, options: InitVennOptions, errors: ValidationError[]): void {
        if (!config.networks) return;

        const configuredNetworks = Object.keys(config.networks);
        const supportedNetworks = Object.values(SupportedVennNetworks);

        for (const network of configuredNetworks) {
            if (!supportedNetworks.includes(network as SupportedVennNetworks)) {
                errors.push({
                    field: `networks.${network}`,
                    message: `Network '${network}' is not currently supported`,
                    suggestion: `Supported networks: ${supportedNetworks.join(', ')}`
                });
            }
        }

        // Warn about network mismatch if --network was specified
        if (options.network && !configuredNetworks.includes(options.network)) {
            errors.push({
                field: 'network-option',
                message: `Specified network '${options.network}' was not included in configuration`,
                suggestion: 'This might indicate a configuration generation issue'
            });
        }
    }

    private isValidEthereumAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    private throwValidationErrors(errors: ValidationError[]): never {
        const errorMessage = this.formatValidationErrors(errors);
        throw new Error(errorMessage);
    }

    private formatValidationErrors(errors: ValidationError[]): string {
        const header = `${colors.red('❌ Configuration validation failed:')}\n`;

        const formattedErrors = errors
            .map((error, index) => {
                let message = `${index + 1}. ${colors.yellow(error.field)}: ${error.message}`;
                if (error.suggestion) {
                    message += `\n   ${colors.cyan('💡 Suggestion:')} ${error.suggestion}`;
                }
                return message;
            })
            .join('\n\n');

        const footer = `\n${colors.grey('Fix these issues and run the command again.')}`;

        return header + formattedErrors + footer;
    }
}

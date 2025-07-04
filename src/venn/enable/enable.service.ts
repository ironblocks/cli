import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as colors from 'colors';
import { AbstractProvider, EventLog, Wallet } from 'ethers';

import { CLIConfig, ContractConfig, SystemContracts } from '@/config/configuration';
import { LoggerService } from '@/lib/logging/logger.service';
import {
    Firewall__factory,
    PolicyDeployer__factory,
    ProtocolRegistry__factory,
    VennFirewallConsumerBase__factory,
} from '@/types/contracts';
import { DEFAULT_PROVIDERS } from '@/venn/default-providers.constants';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';
import { VENN_ADDRESSES } from '@/venn/venn-addresses.constants';

const MEMORY_SLOT_NAMES = {
    FIREWALL_ADDRESS: 'eip1967.firewall',
    ATTESTATION_CENTER_PROXY_ADDRESS: 'eip1967.attestation.center.proxy',
} as const;

export type EnableVennOptions = {
    network: SupportedVennNetworks;
    dryRun: boolean;
    subnets?: number[];
    policy?: string;
};

type ContractInformation = {
    name: string;
    address: string;
    hasFirewall: boolean;
    hasAttestationCenterProxy: boolean;
};

@Injectable()
export class EnableVennService {
    constructor(
        private readonly logger: LoggerService,
        private readonly config: ConfigService<CLIConfig>,
        @Inject('ETHERS') private readonly ethers: typeof import('ethers'),
    ) {}

    async enable(options: EnableVennOptions): Promise<void> {
        const provider = await this.validateProvider(options.network);
        const networkConfig = await this.validateNetworkConfigs(options.network);
        const subnets = await this.validateSubnets(options.network, options.subnets);
        const wallet = await this.validatePrivateKey();

        const contracts = await this.getContractsInformation(networkConfig, provider, options.network);

        let policyAddress: string;
        if (options.policy) {
            // Use custom policy address
            policyAddress = await this.validatePolicyAddress(options.policy);
            this.logger.step('Using custom policy address');
            this.logger.log(` -> Policy address: ${colors.cyan(policyAddress)}`);
        } else {
            // Deploy new policy with default configuration
            policyAddress = await this.deployNewVennPolicy(contracts, wallet, networkConfig, provider);
        }

        await this.setFirewallOnConsumers(contracts, networkConfig, wallet, options.network, provider);

        if (options.dryRun) {
            await this.enableDryRun(contracts, networkConfig, wallet, provider);
        }

        await this.setAttestationCenterProxyOnConsumers(contracts, networkConfig, wallet, policyAddress, provider);
        await this.subscribeConsumersToNewPolicy(contracts, policyAddress, wallet, networkConfig, provider);
        await this.registerContractsInProtocolRegistry(policyAddress, networkConfig, wallet, provider);
        await this.subscribeToRootSubnet(policyAddress, networkConfig, wallet, provider, subnets);
    }

    private async deployNewVennPolicy(
        contracts: ContractInformation[],
        wallet: Wallet,
        networkConfig: SystemContracts,
        provider: AbstractProvider,
    ): Promise<string> {
        this.logger.step('Deploying new Venn policy');

        const {
            Firewall: FIREWALL_ADDRESS,
            ApprovedCallsSigner: APPROVED_CALLS_SIGNER_ADDRESS,
            PolicyDeployer: POLICY_DEPLOYER_ADDRESS,
            ApprovedCallsFactory: APPROVED_CALLS_FACTORY_ADDRESS,
            SafeCallTarget: SAFE_CALL_TARGET_ADDRESS,
        } = networkConfig;

        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);
        this.logger.debug(` -> Approved calls signer address: ${APPROVED_CALLS_SIGNER_ADDRESS}`);
        this.logger.debug(` -> Policy deployer address: ${POLICY_DEPLOYER_ADDRESS}`);
        this.logger.debug(` -> Approved calls factory address: ${APPROVED_CALLS_FACTORY_ADDRESS}`);
        this.logger.debug(` -> Safe function call target address: ${SAFE_CALL_TARGET_ADDRESS}`);

        // We also need a provider and a signer
        //
        const signer = wallet.connect(provider);
        const policyDeployer = PolicyDeployer__factory.connect(POLICY_DEPLOYER_ADDRESS, signer);

        // Prepare the call data for the policy deployer
        //
        const abiCoder = new this.ethers.AbiCoder();
        const callData = abiCoder.encode(
            ['address', 'address', 'address', 'address[]', 'address[]', 'bool[]'],
            [
                FIREWALL_ADDRESS, // firewall
                wallet.address, // defaultAdmin
                wallet.address, // policyAdmin
                [APPROVED_CALLS_SIGNER_ADDRESS], // signers
                contracts.map(c => c.address), // consumers
                contracts.map(() => true), // consumerStatuses
            ],
        );

        // Finally, we can actually deploy the policy
        //
        const tx = await policyDeployer.deployPolicies(FIREWALL_ADDRESS, [APPROVED_CALLS_FACTORY_ADDRESS], [callData]);
        this.logger.log(` -> Transaction hash: ${tx.hash}`);

        // Wait for the transaction to be mined
        const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
        const receipt = await tx.wait();
        spinner.stop();
        this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);

        // Get the policy address from the event log
        //
        const policyAddress: string = (
            receipt?.logs.find(
                log => log.topics[0] === policyDeployer.getEvent('PolicyCreated').getFragment().topicHash,
            ) as EventLog
        )?.args?.[1];

        this.logger.log(` -> Policy address: ${colors.cyan(policyAddress)}`);
        this.logger.success(` -> Venn policy deployed successfully!`);

        return policyAddress;
    }

    private async setFirewallOnConsumers(
        contracts: ContractInformation[],
        networkConfig: SystemContracts,
        wallet: Wallet,
        network: SupportedVennNetworks,
        provider: AbstractProvider,
    ): Promise<void> {
        this.logger.step('Setting Firewall for all contracts');

        // First, we prepare all the addresses we need
        //
        const FIREWALL_ADDRESS = networkConfig.Firewall;
        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);

        // We need a provider and a signer
        //
        const signer = wallet.connect(provider);

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            if (contract.hasFirewall) {
                this.logger.log(
                    ` -> Firewall already set for contract ${colors.cyan(contract.name)} ${colors.grey('(skipping)')} \n`,
                );
                continue;
            }

            this.logger.log(` -> Setting Firewall for contract ${colors.cyan(contract.name)}`);

            const firewallConsumer = VennFirewallConsumerBase__factory.connect(contract.address, signer);
            const tx = await firewallConsumer.setFirewall(FIREWALL_ADDRESS);
            this.logger.log(` -> Transaction hash: ${tx.hash}`);

            // Wait for the transaction to be mined
            const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
            const receipt = await tx.wait();
            spinner.stop();
            this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
        }

        // Extra logging because, why not?
        //
        this.logger.success(` -> Firewall successfully set for all contracts!`);
    }

    private async enableDryRun(
        contracts: ContractInformation[],
        networkConfig: SystemContracts,
        wallet: Wallet,
        provider: AbstractProvider,
    ): Promise<void> {
        this.logger.step('Enabling dry run');

        const FIREWALL_ADDRESS = networkConfig.Firewall;
        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);

        // We need a provider and a signer
        //
        const signer = wallet.connect(provider);

        const firewall = Firewall__factory.connect(FIREWALL_ADDRESS, signer);

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            this.logger.log(` -> Setting dry run for contract ${colors.cyan(contract.name)}`);

            const tx = await firewall.setConsumerDryrunStatus(contract.address, true);
            this.logger.log(` -> Transaction hash: ${tx.hash}`);

            // Wait for the transaction to be mined
            const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
            const receipt = await tx.wait();
            spinner.stop();
            this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
        }

        // Extra logging because, why not?
        //
        this.logger.success(` -> Dry run enabled for all contracts!`);
    }

    private async setAttestationCenterProxyOnConsumers(
        contracts: ContractInformation[],
        networkConfig: SystemContracts,
        wallet: Wallet,
        policyAddress: string,
        provider: AbstractProvider,
    ): Promise<void> {
        this.logger.step('Configuring firewall for all contracts');

        // First, we prepare all the addresses we need
        //
        const SAFE_CALL_TARGET_ADDRESS = networkConfig.SafeCallTarget || policyAddress;
        this.logger.debug(` -> Safe function call target address: ${SAFE_CALL_TARGET_ADDRESS}`);

        // We need a provider and a signer
        //
        const signer = wallet.connect(provider);

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            if (contract.hasAttestationCenterProxy) {
                this.logger.log(
                    ` -> Firewall already configured for contract ${colors.cyan(contract.name)} ${colors.grey('(skipping)')} \n`,
                );
                continue;
            }

            this.logger.log(` -> Setting firewall for contract ${colors.cyan(contract.name)}`);

            const firewallConsumer = VennFirewallConsumerBase__factory.connect(contract.address, signer);
            const tx = await firewallConsumer.setAttestationCenterProxy(SAFE_CALL_TARGET_ADDRESS);
            this.logger.log(` -> Transaction hash: ${tx.hash}`);

            const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
            const receipt = await tx.wait();
            spinner.stop();
            this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
        }

        this.logger.success(` -> Firewall successfully configured for all contracts!`);
    }

    private async subscribeConsumersToNewPolicy(
        contracts: ContractInformation[],
        policyAddress: string,
        wallet: Wallet,
        networkConfig: SystemContracts,
        provider: AbstractProvider,
    ): Promise<void> {
        this.logger.step('Registering new policy');

        // First, we prepare all the addresses we need
        //
        const FIREWALL_ADDRESS = networkConfig.Firewall;
        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);

        // We need a provider and a signer
        //
        const signer = wallet.connect(provider);

        const consumerAddresses = contracts.map(c => c.address);
        const firewall = Firewall__factory.connect(FIREWALL_ADDRESS, signer);

        // Send the transaction
        //
        const tx = await firewall.addGlobalPolicyForConsumers(consumerAddresses, policyAddress);
        this.logger.log(` -> Transaction hash: ${tx.hash}`);

        // Wait for the transaction to be mined
        //
        const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
        const receipt = await tx.wait();
        spinner.stop();
        this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);

        // Extra logging because, why not?
        //
        this.logger.success(` -> Firewall successfully configured for all contracts!`);
    }

    private async registerContractsInProtocolRegistry(
        policyAddress: string,
        networkConfig: SystemContracts,
        wallet: Wallet,
        provider: AbstractProvider,
    ): Promise<void> {
        this.logger.step('Registering protocol in the registry');

        // First, we prepare all the addresses we need
        //
        const PROTOCOL_REGISTRY_ADDRESS = networkConfig.ProtocolRegistry;
        const PROTOCOL_METADATA =
            this.config.get('protocolMetadata', { infer: true }) ||
            `https://venn-protocol.com/protocols/${policyAddress}`;

        this.logger.debug(` -> Protocol registry address: ${PROTOCOL_REGISTRY_ADDRESS}`);
        this.logger.debug(` -> Protocol metadata: "${PROTOCOL_METADATA}"`);

        // We need a provider and a signer
        //
        const signer = wallet.connect(provider);

        const protocolRegistry = ProtocolRegistry__factory.connect(PROTOCOL_REGISTRY_ADDRESS, signer);

        // Send the transaction
        //
        const tx = await protocolRegistry.registerProtocol(policyAddress, PROTOCOL_METADATA);
        this.logger.log(` -> Transaction hash: ${tx.hash}`);

        // Wait for the transaction to be mined
        //
        const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
        const receipt = await tx.wait();
        spinner.stop();
        this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);

        // Extra logging because, why not?
        //
        this.logger.success(` -> Protocol successfully registered in protocol registry!`);
    }

    async subscribeToRootSubnet(
        policyAddress: string,
        networkConfig: SystemContracts,
        wallet: Wallet,
        provider: AbstractProvider,
        subnets: number[],
    ): Promise<void> {
        this.logger.step('Subscribing to the root subnet');

        // First, we prepare all the addresses we need
        //
        const PROTOCOL_REGISTRY_ADDRESS = networkConfig.ProtocolRegistry;
        this.logger.debug(` -> Protocol registry address: ${PROTOCOL_REGISTRY_ADDRESS}`);
        this.logger.debug(` -> Subnets to subscribe: ${subnets}`);

        const signer = wallet.connect(provider);

        const protocolRegistry = ProtocolRegistry__factory.connect(PROTOCOL_REGISTRY_ADDRESS, signer);

        for (const subnet of subnets) {
            this.logger.log(` -> Subscribing to subnet ${subnet}`);

            // Send the transaction
            //
            const tx = await protocolRegistry.subscribeSubnet(policyAddress, subnet, []);
            this.logger.log(` -> Transaction hash: ${tx.hash}`);

            // Wait for the transaction to be mined
            //
            const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
            const receipt = await tx.wait();
            spinner.stop();
            this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
        }

        // Extra logging because, why not?
        //
        this.logger.success(` -> Subscribed to root subnet!`);
    }

    private async validateNetworkConfigs(network: string): Promise<SystemContracts> {
        this.logger.log(` -> Network: ${colors.cyan(network)}`);

        const networkConfig = this.config.get('networks', { infer: true })[network];
        if (!networkConfig) {
            throw new Error(`Missing configuration for network ${colors.cyan(network)}`);
        }

        const userContractsAreConfigured = networkConfig.contracts && Object.keys(networkConfig.contracts).length > 0;
        if (!userContractsAreConfigured) {
            throw new Error(`No user contracts configured for network ${colors.cyan(network)}`);
        }

        // Check that all contracts are valid ethereum addresses
        Object.entries(networkConfig.contracts).forEach(([name, contractConfig]: [string, ContractConfig]) => {
            if (!this.ethers.isAddress(contractConfig.address)) {
                throw new Error(
                    `Invalid address for contract ${colors.red(name)}: ${colors.red(contractConfig.address)}`,
                );
            }
        });

        // Check that all Venn contracts are available either from pre-deployed addresses
        // or from custom user configuration
        const firewall = networkConfig.overrides?.Firewall || VENN_ADDRESSES[network.toUpperCase()].FIREWALL;
        if (!this.ethers.isAddress(firewall)) {
            throw new Error(`Invalid address for contract ${colors.red('Firewall Address')}: ${colors.red(firewall)}`);
        }

        const approvedCallsSigner =
            networkConfig.overrides?.ApprovedCallsSigner ||
            VENN_ADDRESSES[network.toUpperCase()]?.APPROVED_CALLS_SIGNER;
        if (!this.ethers.isAddress(approvedCallsSigner)) {
            throw new Error(
                `Invalid address for ${colors.red('Approved Calls Signer')}: ${colors.red(approvedCallsSigner)}`,
            );
        }

        const policyDeployer =
            networkConfig.overrides?.PolicyDeployer || VENN_ADDRESSES[network.toUpperCase()]?.POLICY_DEPLOYER;
        if (!this.ethers.isAddress(policyDeployer)) {
            throw new Error(
                `Invalid address for contract ${colors.red('Policy Deployer')}: ${colors.red(policyDeployer)}`,
            );
        }

        const approvedCallsFactory =
            networkConfig.overrides?.ApprovedCallsFactory ||
            VENN_ADDRESSES[network.toUpperCase()]?.APPROVED_CALLS_FACTORY;
        if (!this.ethers.isAddress(approvedCallsFactory)) {
            throw new Error(
                `Invalid address for contract ${colors.red('Approved Calls Factory')}: ${colors.red(approvedCallsFactory)}`,
            );
        }

        const safeCallTarget =
            networkConfig.overrides?.SafeCallTarget || VENN_ADDRESSES[network.toUpperCase()]?.SAFE_CALL_TARGET;
        if (safeCallTarget && !this.ethers.isAddress(safeCallTarget)) {
            throw new Error(`Invalid address for ${colors.red('Safe Call Target')}: ${colors.red(safeCallTarget)}`);
        }

        const protocolRegistry =
            networkConfig.overrides?.ProtocolRegistry || VENN_ADDRESSES[network.toUpperCase()]?.PROTOCOL_REGISTRY;
        if (protocolRegistry && !this.ethers.isAddress(protocolRegistry)) {
            throw new Error(`Invalid address for ${colors.red('Protocol Registry')}: ${colors.red(protocolRegistry)}`);
        }

        // Validate that we have an RPC provider for the selected network
        networkConfig.provider = networkConfig.provider || DEFAULT_PROVIDERS[network.toUpperCase()];
        try {
            // If we can get the latest block, we can assume good connection to the network
            const provider = new this.ethers.JsonRpcProvider(networkConfig.provider);
            await provider.getBlockNumber();
        } catch (_error) {
            throw new Error(
                `Could not connect to network ${colors.cyan(network)} using provider ${colors.cyan(networkConfig.provider)}`,
            );
        }

        this.logger.debug(` -> Network configuration are ok`);

        return {
            Firewall: firewall,
            ApprovedCallsSigner: approvedCallsSigner,
            PolicyDeployer: policyDeployer,
            ApprovedCallsFactory: approvedCallsFactory,
            SafeCallTarget: safeCallTarget,
            ProtocolRegistry: protocolRegistry,
        };
    }

    private async validateProvider(network: string): Promise<AbstractProvider> {
        const networkConfig = this.config.get('networks', { infer: true })[network];
        // Validate that we have an RPC provider for the selected network
        const providerUrl = networkConfig.provider || DEFAULT_PROVIDERS[network.toUpperCase()];

        try {
            // If we can get the latest block, we can assume good connection to the network
            const provider = new this.ethers.JsonRpcProvider(providerUrl);
            await provider.getBlockNumber();

            return provider;
        } catch (_error) {
            throw new Error(
                `Could not connect to network ${colors.cyan(network)} using provider ${colors.cyan(networkConfig.provider)}`,
            );
        }
    }

    private async validateSubnets(network: string, subnets?: number[]): Promise<number[]> {
        const subnetsConfig = this.config.get('subnets', { infer: true })[network] || { subnets: [] };

        const result = subnets || subnetsConfig.subnets || [VENN_ADDRESSES[network.toUpperCase()]?.ROOT_SUBNET];

        if (!result) {
            throw new Error(`Subnets not configured for network ${colors.cyan(network)}`);
        }

        const uniqueSubnets = new Set(result);
        if (uniqueSubnets.size !== result.length) {
            throw new Error(`Duplicate subnets provided`);
        }

        return result;
    }

    private async validatePrivateKey(): Promise<Wallet> {
        const privateKey = this.config.get('privateKey', { infer: true });
        if (!privateKey) {
            throw new Error(`Missing private key (did you set ${colors.cyan('VENN_PRIVATE_KEY')}?)`);
        }

        try {
            const wallet = new this.ethers.Wallet(privateKey);
            this.logger.log(` -> Account: ${colors.cyan(wallet.address)}`);

            return wallet;
        } catch (_error) {
            throw new Error(`Invalid private key`);
        }
    }

    private computeSlotAddress(slotName: string): bigint {
        const keccakHash = this.ethers.keccak256(this.ethers.toUtf8Bytes(slotName));
        const hashBigNumber = this.ethers.toBigInt(keccakHash);
        const storageSlotBigNumber = hashBigNumber - 1n;
        return storageSlotBigNumber;
    }

    private async getContractsInformation(
        networkConfig: SystemContracts,
        provider: AbstractProvider,
        network: SupportedVennNetworks,
    ): Promise<ContractInformation[]> {
        const contracts = this.config.get('networks', { infer: true })[network].contracts;

        const contractsInfo = await Promise.all(
            Object.entries(contracts).map(async ([name, contractConfig]: [string, ContractConfig]) => ({
                name,
                address: contractConfig.address,
                hasFirewall: await this.isFirewallSetOnConsumer(networkConfig, provider, contractConfig.address),
                hasAttestationCenterProxy: await this.isSafeCallTargetSetOnConsumer(
                    networkConfig,
                    provider,
                    contractConfig.address,
                ),
            })),
        );

        this.logger.debug(` -> Contracts information: ${JSON.stringify(contractsInfo, null, 2)}`);
        return contractsInfo;
    }

    private async isFirewallSetOnConsumer(
        networkConfig: SystemContracts,
        provider: AbstractProvider,
        consumerAddress: string,
    ): Promise<boolean> {
        const firewallAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.FIREWALL_ADDRESS);
        const firewallAddressSlotValue = await provider.getStorage(consumerAddress, firewallAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + firewallAddressSlotValue.slice(-40));
        const networkAddress = networkConfig.Firewall;

        this.logger.debug(` -> Memory  Firewall address: ${setAddress}`);
        this.logger.debug(` -> Network Firewall address: ${networkAddress}`);
        return setAddress === networkAddress;
    }

    private async isSafeCallTargetSetOnConsumer(
        networkConfig: SystemContracts,
        provider: AbstractProvider,
        consumerAddress: string,
    ): Promise<boolean> {
        const safeCallTargetAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.ATTESTATION_CENTER_PROXY_ADDRESS);
        const safeCallTargetAddressSlotValue = await provider.getStorage(consumerAddress, safeCallTargetAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + safeCallTargetAddressSlotValue.slice(-40));
        const networkAddress = networkConfig.SafeCallTarget;

        this.logger.debug(` -> Memory  Safe Call Target address: ${setAddress}`);
        this.logger.debug(` -> Network Safe Call Target address: ${networkAddress}`);
        return setAddress === networkAddress;
    }

    private async validatePolicyAddress(policyAddress: string): Promise<string> {
        if (!this.ethers.isAddress(policyAddress)) {
            throw new Error(`Invalid policy address: ${colors.red(policyAddress)}`);
        }

        return this.ethers.getAddress(policyAddress);
    }
}

import * as colors from 'colors';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { VENN_ADDRESSES } from '@/venn/venn-addresses.constants';
import { DEFAULT_PROVIDERS } from '@/venn/default-providers.constants';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';

const MEMORY_SLOT_NAMES = {
    FIREWALL_ADDRESS: 'eip1967.firewall',
    ATTESTATION_CENTER_PROXY_ADDRESS: 'eip1967.attestation.center.proxy'
};

export type EnableVennOptions = {
    network: SupportedVennNetworks;
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
        private readonly config: ConfigService,
        @Inject('ETHERS') private readonly ethers: typeof import('ethers')
    ) {}

    async enable(options: EnableVennOptions) {
        this.logger.log(` -> Network: ${colors.cyan(options.network)}`);

        await this.validateNetworkConfigs(options.network);
        await this.validatePrivateKey();

        const wallet = new this.ethers.Wallet(this.config.get('privateKey'));
        const contracts = await this.getContractsInformation(options.network);

        const newPolicyAddress = await this.deployNewVennPolicy(contracts, wallet, options.network);
        await this.setFirewallOnConsumers(contracts, wallet, options.network);
        await this.setAttestationCenterProxyOnConsumers(contracts, wallet, options.network);
        await this.subscribeConsumersToNewPolicy(contracts, newPolicyAddress, wallet, options.network);
    }

    async deployNewVennPolicy(contracts: ContractInformation[], wallet: import('ethers').Wallet, network: SupportedVennNetworks): Promise<string> {
        this.logger.step('Deploying new Venn policy');

        // First, we prepare all the addresses we need
        //
        const NETWORK_KEY = network.toUpperCase();
        const FIREWALL_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].FIREWALL;
        const APPROVED_CALLS_SIGNER_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].APPROVED_CALLS_SIGNER;
        const POLICY_DEPLOYER_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].POLICY_DEPLOYER;
        const APPROVED_CALLS_FACTORY_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].APPROVED_CALLS_FACTORY;
        const SAFE_CALL_TARGET_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].SAFE_CALL_TARGET;

        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);
        this.logger.debug(` -> Approved calls signer address: ${APPROVED_CALLS_SIGNER_ADDRESS}`);
        this.logger.debug(` -> Policy deployer address: ${POLICY_DEPLOYER_ADDRESS}`);
        this.logger.debug(` -> Approved calls factory address: ${APPROVED_CALLS_FACTORY_ADDRESS}`);
        this.logger.debug(` -> Safe function call target address: ${SAFE_CALL_TARGET_ADDRESS}`);

        // We also need a provider and a signer
        //
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);
        const signer = wallet.connect(provider);

        // Get an instance of the policy deployer contract
        // We only use this one function, so the ABI is hardcoded for now
        //
        const policyDeployerMinimalABI = ['function deployPolicies(address, address[], bytes[]) external returns (address[])'];
        const policyDeployer = new this.ethers.Contract(POLICY_DEPLOYER_ADDRESS, policyDeployerMinimalABI, signer);

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
                contracts.map(() => true) // consumerStatuses
            ]
        );

        // The easiest way to get the resulting policy address (which we need for later steps)
        // is to make a static call which returns an array of addresses from the deployer
        //
        const [policyAddress] = await policyDeployer.deployPolicies.staticCall(FIREWALL_ADDRESS, [APPROVED_CALLS_FACTORY_ADDRESS], [callData]);
        this.logger.log(` -> Policy address: ${colors.cyan(policyAddress)}`);

        // Finally, we can actually deploy the policy
        //
        const tx = await policyDeployer.deployPolicies(FIREWALL_ADDRESS, [APPROVED_CALLS_FACTORY_ADDRESS], [callData]);
        this.logger.log(` -> Transaction hash: ${tx.hash}`);

        // Wait for the transaction to be mined
        const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
        const receipt = await tx.wait();
        spinner.stop();
        this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);

        // Extra logging because, why not?
        //
        this.logger.success(` -> Venn policy deployed successfully!`);
        return policyAddress;
    }

    async setFirewallOnConsumers(contracts: ContractInformation[], wallet: import('ethers').Wallet, network: SupportedVennNetworks) {
        this.logger.step('Setting Firewall for all contracts');

        // First, we prepare all the addresses we need
        //
        const NETWORK_KEY = network.toUpperCase();
        const FIREWALL_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].FIREWALL;
        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);

        // We need a provider and a signer
        //
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);
        const signer = wallet.connect(provider);

        // We only use this one function, so the ABI is hardcoded for now
        //
        const firewallConsumerMinimalABI = ['function setFirewall(address)'];

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            if (contract.hasFirewall) {
                this.logger.log(` -> Firewall already set for contract ${colors.cyan(contract.name)} ${colors.grey('(skipping)')} \n`);
                continue;
            } else {
                this.logger.log(` -> Setting Firewall for contract ${colors.cyan(contract.name)}`);

                const firewallConsumer = new this.ethers.Contract(contract.address, firewallConsumerMinimalABI, signer);
                const tx = await firewallConsumer.setFirewall(FIREWALL_ADDRESS);
                this.logger.log(` -> Transaction hash: ${tx.hash}`);

                // Wait for the transaction to be mined
                const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
                const receipt = await tx.wait();
                spinner.stop();
                this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
            }
        }

        // Extra logging because, why not?
        //
        this.logger.success(` -> Firewall successfully set for all contracts!`);
    }

    async setAttestationCenterProxyOnConsumers(contracts: ContractInformation[], wallet: import('ethers').Wallet, network: SupportedVennNetworks) {
        this.logger.step('Configuring firewall for all contracts');

        // First, we prepare all the addresses we need
        //
        const NETWORK_KEY = network.toUpperCase();
        const SAFE_CALL_TARGET_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].SAFE_CALL_TARGET;
        this.logger.debug(` -> Safe function call target address: ${SAFE_CALL_TARGET_ADDRESS}`);

        // We need a provider and a signer
        //
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);
        const signer = wallet.connect(provider);

        // We only use this one function, so the ABI is hardcoded for now
        // ACP: Attestation Center Proxy
        //
        const ACPConsumerMinimalABI = ['function setAttestationCenterProxy(address)'];

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            if (contract.hasAttestationCenterProxy) {
                this.logger.log(` -> Firewall already configured for contract ${colors.cyan(contract.name)} ${colors.grey('(skipping)')} \n`);
                continue;
            } else {
                this.logger.log(` -> Setting firewall for contract ${colors.cyan(contract.name)}`);

                const firewallConsumer = new this.ethers.Contract(contract.address, ACPConsumerMinimalABI, signer);
                const tx = await firewallConsumer.setAttestationCenterProxy(SAFE_CALL_TARGET_ADDRESS);
                this.logger.log(` -> Transaction hash: ${tx.hash}`);

                // Wait for the transaction to be mined
                const spinner = this.logger.spinner(' -> Waiting for transaction to be mined');
                const receipt = await tx.wait();
                spinner.stop();
                this.logger.log(` -> Mined at block: ${receipt.blockNumber} \n`);
            }
        }

        // Extra logging because, why not?
        //
        this.logger.success(` -> Firewall successfully configured for all contracts!`);
    }

    async subscribeConsumersToNewPolicy(contracts: ContractInformation[], policyAddress: string, wallet: import('ethers').Wallet, network: SupportedVennNetworks) {
        this.logger.step('Registering new policy');

        // First, we prepare all the addresses we need
        //
        const NETWORK_KEY = network.toUpperCase();
        const FIREWALL_ADDRESS = VENN_ADDRESSES[NETWORK_KEY].FIREWALL;
        this.logger.debug(` -> Firewall address: ${FIREWALL_ADDRESS}`);

        // We need a provider and a signer
        //
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);
        const signer = wallet.connect(provider);

        // We only use this one function, so the ABI is hardcoded for now
        //
        const firewallMinimalABI = ['function addGlobalPolicyForConsumers(address[], address)'];
        const consumerAddresses = contracts.map(c => c.address);
        const firewall = new this.ethers.Contract(FIREWALL_ADDRESS, firewallMinimalABI, signer);

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

    async validateNetworkConfigs(network: string) {
        const networkIsSupported = Object.values(SupportedVennNetworks).includes(network as SupportedVennNetworks);
        if (!networkIsSupported) {
            throw new Error(`Network ${colors.red(network)} is not supported`);
        }

        const networkConfig = this.config.get('networks')[network];
        if (!networkConfig) {
            throw new Error(`Missing configuration for network ${colors.cyan(network)}`);
        }

        const contractsAreConfigured = networkConfig.contracts && Object.keys(networkConfig.contracts).length > 0;
        if (!contractsAreConfigured) {
            throw new Error(`No contracts configured for network ${colors.cyan(network)}`);
        }

        // Check that all contracts are valid ethereum addresses
        Object.entries(networkConfig.contracts).forEach(([name, address]: [string, string]) => {
            if (!this.ethers.isAddress(address)) {
                throw new Error(`Invalid address for contract ${colors.red(name)}: ${colors.red(address)}`);
            }
        });

        this.logger.debug(` -> Network configuration are ok`);
    }

    async validatePrivateKey() {
        const privateKey = this.config.get('privateKey');
        if (!privateKey) {
            throw new Error(`Missing private key (did you set ${colors.cyan('VENN_PRIVATE_KEY')}?)`);
        }

        try {
            const wallet = new this.ethers.Wallet(privateKey);
            this.logger.log(` -> Account: ${colors.cyan(wallet.address)}`);
        } catch (error) {
            throw new Error(`Invalid private key`);
        }
    }

    computeSlotAddress(slotName: string) {
        const keccakHash = this.ethers.keccak256(this.ethers.toUtf8Bytes(slotName));
        const hashBigNumber = this.ethers.toBigInt(keccakHash);
        const storageSlotBigNumber = hashBigNumber - 1n;
        return storageSlotBigNumber;
    }

    async getContractsInformation(network: SupportedVennNetworks): Promise<ContractInformation[]> {
        const contracts = this.config.get('networks')[network].contracts;

        const contractsInfo = await Promise.all(
            Object.entries(contracts).map(async ([name, address]: [string, string]) => ({
                name,
                address,
                hasFirewall: await this.isFirewallSetOnConsumer(network, address),
                hasAttestationCenterProxy: await this.isAttestationCenterProxySetOnConsumer(network, address)
            }))
        );

        this.logger.debug(` -> Contracts information: ${JSON.stringify(contractsInfo, null, 2)}`);
        return contractsInfo;
    }

    async isFirewallSetOnConsumer(network: SupportedVennNetworks, consumerAddress: string) {
        const NETWORK_KEY = network.toUpperCase();
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);

        const firewallAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.FIREWALL_ADDRESS);
        const firewallAddressSlotValue = await provider.getStorage(consumerAddress, firewallAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + firewallAddressSlotValue.slice(-40));
        const networkAddress = VENN_ADDRESSES[NETWORK_KEY].FIREWALL;

        this.logger.debug(` -> Memory  Firewall address: ${setAddress}`);
        this.logger.debug(` -> Network Firewall address: ${networkAddress}`);
        return setAddress === networkAddress;
    }

    async isAttestationCenterProxySetOnConsumer(network: SupportedVennNetworks, consumerAddress: string) {
        const NETWORK_KEY = network.toUpperCase();
        const provider = this.ethers.getDefaultProvider(DEFAULT_PROVIDERS[NETWORK_KEY]);

        const attestationCenterProxyAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.ATTESTATION_CENTER_PROXY_ADDRESS);
        const attestationCenterProxyAddressSlotValue = await provider.getStorage(consumerAddress, attestationCenterProxyAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + attestationCenterProxyAddressSlotValue.slice(-40));
        const networkAddress = VENN_ADDRESSES[network.toUpperCase()].SAFE_CALL_TARGET;

        this.logger.debug(` -> Memory  Attestation Center Proxy address: ${setAddress}`);
        this.logger.debug(` -> Network Attestation Center Proxy address: ${networkAddress}`);
        return setAddress === networkAddress;
    }
}

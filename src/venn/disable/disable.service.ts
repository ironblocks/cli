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

export type DisableVennOptions = {
    network: SupportedVennNetworks;
};

type ContractInformation = {
    name: string;
    address: string;
    hasFirewall: boolean;
    hasAttestationCenterProxy: boolean;
};

@Injectable()
export class DisableVennService {
    constructor(
        private readonly logger: LoggerService,
        private readonly config: ConfigService,
        @Inject('ETHERS') private readonly ethers: typeof import('ethers')
    ) {}

    async disable(options: DisableVennOptions) {
        await this.validateNetworkConfigs(options.network);
        await this.validatePrivateKey();

        const wallet = new this.ethers.Wallet(this.config.get('privateKey'));
        const contracts = await this.getContractsInformation(options.network);

        await this.removeFirewallFromConsumers(contracts, wallet, options.network);
    }

    async removeFirewallFromConsumers(contracts: ContractInformation[], wallet: import('ethers').Wallet, network: SupportedVennNetworks) {
        this.logger.step('Removing firewall from all contracts');

        // First, we prepare all the addresses we need
        //
        const networkConfig = this.config.get('networks')[network];
        const ZERO_ADDRESS = this.ethers.ZeroAddress;
        const FIREWALL_ADDRESS = networkConfig.firewall;
        this.logger.debug(` -> Current Firewall address: ${FIREWALL_ADDRESS}`);
        this.logger.debug(` -> New     Firewall address: ${ZERO_ADDRESS}`);

        // We need a provider and a signer
        //
        const provider = this.ethers.getDefaultProvider(networkConfig.provider);
        const signer = wallet.connect(provider);

        // We only use this one function, so the ABI is hardcoded for now
        //
        const firewallConsumerMinimalABI = ['function setFirewall(address)'];

        // We don't want to mess with the nonces, so we do this one by one
        //
        for (const contract of contracts) {
            if (!contract.hasFirewall) {
                this.logger.log(` -> No Firewall set for contract ${colors.cyan(contract.name)} ${colors.grey('(skipping)')} \n`);
                continue;
            } else {
                this.logger.log(` -> Removing Firewall from contract ${colors.cyan(contract.name)}`);

                const firewallConsumer = new this.ethers.Contract(contract.address, firewallConsumerMinimalABI, signer);
                const tx = await firewallConsumer.setFirewall(ZERO_ADDRESS);
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
        this.logger.success(` -> Firewall successfully removed from all contracts!`);
    }

    async validateNetworkConfigs(network: string) {
        this.logger.log(` -> Network: ${colors.cyan(network)}`);

        // const networkIsSupported = Object.values(SupportedVennNetworks).includes(network as SupportedVennNetworks);
        // if (!networkIsSupported) {
        //     throw new Error(`Unsupported network: ${colors.cyan(network)}`);
        // }

        const networkConfig = this.config.get('networks')[network];
        if (!networkConfig) {
            throw new Error(`Missing configuration for network ${colors.cyan(network)}`);
        }

        const userContractsAreConfigured = networkConfig.contracts && Object.keys(networkConfig.contracts).length > 0;
        if (!userContractsAreConfigured) {
            throw new Error(`No user contracts configured for network ${colors.cyan(network)}`);
        }

        // Check that all contracts are valid ethereum addresses
        Object.entries(networkConfig.contracts).forEach(([name, address]: [string, string]) => {
            if (!this.ethers.isAddress(address)) {
                throw new Error(`Invalid address for contract ${colors.red(name)}: ${colors.red(address)}`);
            }
        });

        // Check that all Venn contracts are available either from pre-deployed addresses
        // or from custom user configuration
        networkConfig.firewall = networkConfig.firewall || VENN_ADDRESSES[network.toUpperCase()].FIREWALL;
        const firewallAddressIsInvalid = !this.ethers.isAddress(networkConfig.firewall);
        if (firewallAddressIsInvalid) {
            throw new Error(`Invalid address for contract ${colors.red('Firewall Address')}: ${colors.red(networkConfig.firewall)}`);
        }

        networkConfig.approvedCallsSigner = networkConfig.approvedCallsSigner || VENN_ADDRESSES[network.toUpperCase()]?.APPROVED_CALLS_SIGNER;
        const approvedCallsSignerIsAddressInvalid = !this.ethers.isAddress(networkConfig.approvedCallsSigner);
        if (approvedCallsSignerIsAddressInvalid) {
            throw new Error(`Invalid address for ${colors.red('Approved Calls Signer')}: ${colors.red(networkConfig.approvedCallsSigner)}`);
        }

        networkConfig.policyDeployer = networkConfig.policyDeployer || VENN_ADDRESSES[network.toUpperCase()]?.POLICY_DEPLOYER;
        const policyDeployerAddressIsInvalid = !this.ethers.isAddress(networkConfig.policyDeployer);
        if (policyDeployerAddressIsInvalid) {
            throw new Error(`Invalid address for contract ${colors.red('Policy Deployer')}: ${colors.red(networkConfig.policyDeployer)}`);
        }

        networkConfig.approvedCallsFactory = networkConfig.approvedCallsFactory || VENN_ADDRESSES[network.toUpperCase()]?.APPROVED_CALLS_FACTORY;
        const approvedCallsFactoryIsInvalid = !this.ethers.isAddress(networkConfig.approvedCallsFactory);
        if (approvedCallsFactoryIsInvalid) {
            throw new Error(`Invalid address for contract ${colors.red('Approved Calls Factory')}: ${colors.red(networkConfig.approvedCallsFactory)}`);
        }

        networkConfig.safeCallTarget = networkConfig.safeCallTarget || VENN_ADDRESSES[network.toUpperCase()]?.SAFE_CALL_TARGET;
        const safeCallTargetAddressIsInvalid = networkConfig.safeCallTarget && !this.ethers.isAddress(networkConfig.safeCallTarget);
        if (safeCallTargetAddressIsInvalid) {
            throw new Error(`Invalid address for ${colors.red('Safe Call Target')}: ${colors.red(networkConfig.safeCallTarget)}`);
        }

        // Validate that we have an RPC provider for the selected network
        networkConfig.provider = networkConfig.provider || DEFAULT_PROVIDERS[network.toUpperCase()];
        try {
            // If we can get the latest block, we can assume good connection to the network
            const provider = new this.ethers.JsonRpcProvider(networkConfig.provider);
            await provider.getBlockNumber();
        } catch (error) {
            throw new Error(`Could not connect to network ${colors.cyan(network)} using provider ${colors.cyan(networkConfig.provider)}`);
        }

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
                hasAttestationCenterProxy: await this.isSafeCallTargetSetOnConsumer(network, address)
            }))
        );

        this.logger.debug(` -> Contracts information: ${JSON.stringify(contractsInfo, null, 2)}`);
        return contractsInfo;
    }

    async isFirewallSetOnConsumer(network: SupportedVennNetworks, consumerAddress: string) {
        const networkConfig = this.config.get('networks')[network];
        const provider = this.ethers.getDefaultProvider(networkConfig.provider);

        const firewallAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.FIREWALL_ADDRESS);
        const firewallAddressSlotValue = await provider.getStorage(consumerAddress, firewallAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + firewallAddressSlotValue.slice(-40));
        const networkAddress = networkConfig.firewall;

        this.logger.debug(` -> Memory  Firewall address: ${setAddress}`);
        this.logger.debug(` -> Network Firewall address: ${networkAddress}`);
        return setAddress === networkAddress;
    }

    async isSafeCallTargetSetOnConsumer(network: SupportedVennNetworks, consumerAddress: string) {
        const networkConfig = this.config.get('networks')[network];
        const provider = this.ethers.getDefaultProvider(networkConfig.provider);

        const safeCallTargetAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.ATTESTATION_CENTER_PROXY_ADDRESS);
        const safeCallTargetAddressSlotValue = await provider.getStorage(consumerAddress, safeCallTargetAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + safeCallTargetAddressSlotValue.slice(-40));
        const networkAddress = networkConfig.safeCallTarget;

        this.logger.debug(` -> Memory  Safe Call Target address: ${setAddress}`);
        this.logger.debug(` -> Network Safe Call Target address: ${networkAddress}`);
        return setAddress === networkAddress;
    }
}

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as colors from 'colors';
import { AbstractProvider, Wallet } from 'ethers';

import { CLIConfig } from '@/config/configuration';
import { LoggerService } from '@/lib/logging/logger.service';
import { ModeCommandOptions } from '@/mode/mode.command';
import { Firewall__factory } from '@/types/contracts';
import { DEFAULT_PROVIDERS } from '@/venn/default-providers.constants';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';
import { VENN_ADDRESSES } from '@/venn/venn-addresses.constants';

const MEMORY_SLOT_NAMES = {
    FIREWALL_ADDRESS: 'eip1967.firewall',
} as const;

type ContractInformation = {
    name: string;
    address: string;
    hasFirewall: boolean;
    isDryRunEnabled: boolean;
};

@Injectable()
export class ModeService {
    constructor(
        private readonly logger: LoggerService,
        private readonly config: ConfigService<CLIConfig>,
        @Inject('ETHERS') private readonly ethers: typeof import('ethers'),
    ) {}

    async getContractModes(options: ModeCommandOptions): Promise<ContractInformation[]> {
        const provider = await this.validateProvider(options.network);
        const networkConfig = await this.validateNetworkConfigs(options.network);

        const contracts = await this.getContractsInformation(networkConfig, provider, options.network);

        return contracts;
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

    private async validateNetworkConfigs(network: string): Promise<{ Firewall: string }> {
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
        Object.entries(networkConfig.contracts).forEach(([name, address]: [string, string]) => {
            if (!this.ethers.isAddress(address)) {
                throw new Error(`Invalid address for contract ${colors.red(name)}: ${colors.red(address)}`);
            }
        });

        // Check that all Venn contracts are available either from pre-deployed addresses
        // or from custom user configuration
        const firewall = networkConfig.overrides?.Firewall || VENN_ADDRESSES[network.toUpperCase()].FIREWALL;
        if (!this.ethers.isAddress(firewall)) {
            throw new Error(`Invalid address for contract ${colors.red('Firewall Address')}: ${colors.red(firewall)}`);
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
        };
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

    private async getContractsInformation(
        networkConfig: { Firewall: string },
        provider: AbstractProvider,
        network: SupportedVennNetworks,
    ): Promise<ContractInformation[]> {
        const contracts = this.config.get('networks', { infer: true })[network].contracts;

        const contractsInfo = await Promise.all(
            Object.entries(contracts).map(async ([name, address]) => ({
                name,
                address,
                hasFirewall: await this.isFirewallSetOnConsumer(networkConfig.Firewall, provider, address),
                isDryRunEnabled: await this.isDryRunSetOnConsumer(networkConfig.Firewall, provider, address),
            })),
        );

        this.logger.debug(` -> Contracts information: ${JSON.stringify(contractsInfo, null, 2)}`);
        return contractsInfo;
    }

    private async isFirewallSetOnConsumer(
        firewallAddress: string,
        provider: AbstractProvider,
        consumerAddress: string,
    ): Promise<boolean> {
        const firewallAddressSlot = this.computeSlotAddress(MEMORY_SLOT_NAMES.FIREWALL_ADDRESS);
        const firewallAddressSlotValue = await provider.getStorage(consumerAddress, firewallAddressSlot);

        const setAddress = this.ethers.getAddress('0x' + firewallAddressSlotValue.slice(-40));
        const networkAddress = firewallAddress;

        this.logger.debug(` -> Memory  Firewall address: ${setAddress}`);
        this.logger.debug(` -> Network Firewall address: ${networkAddress}`);
        return setAddress === networkAddress;
    }

    private async isDryRunSetOnConsumer(
        firewallAddress: string,
        provider: AbstractProvider,
        consumerAddress: string,
    ): Promise<boolean> {
        const firewall = Firewall__factory.connect(firewallAddress, provider);
        const dryRunStatus = await firewall.dryrunEnabled(consumerAddress);
        return dryRunStatus;
    }

    private computeSlotAddress(slotName: string): bigint {
        const keccakHash = this.ethers.keccak256(this.ethers.toUtf8Bytes(slotName));
        const hashBigNumber = this.ethers.toBigInt(keccakHash);
        const storageSlotBigNumber = hashBigNumber - 1n;
        return storageSlotBigNumber;
    }
}

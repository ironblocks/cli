import { join } from 'path';
import { cwd } from 'process';

const CONFIG_FILE_NAME = 'venn.config.json';
const LOCAL_CONFIG_PATH = join(cwd(), CONFIG_FILE_NAME);

export type SystemContracts = {
    Firewall: string;
    ApprovedCallsSigner: string;
    PolicyDeployer: string;
    ApprovedCallsFactory: string;
    SafeCallTarget: string;
    ProtocolRegistry: string;
};

type SimpleContractConfig = string;

export type ContractConfig = {
    address: string;
    mode?: 'live' | 'dry-run';
};

type NetworksConfiguration = {
    [network: string]: {
        contracts: {
            [contractName: string]: ContractConfig;
        };
        overrides?: Partial<SystemContracts>;
        provider?: string;
    };
};

type SubnetsConfiguration = {
    [network: string]: {
        subnets: number[];
    };
};

export type CLIConfig = {
    logLevel?: number;

    fw?: {
        integ?: {
            // Allow list of solidity contract files and directories to consider when integrating with the firewall.
            include?: string[];
            // Ignore list of solidity contract files and directories to exclude when integrating with the firewall.
            exclude?: string[];
            // Whether to ignore the default firewall integration exclude list.
            overrideDefaults?: boolean;
        };
    };

    networks?: NetworksConfiguration;
    subnets?: SubnetsConfiguration;
    privateKey?: string;
    protocolMetadata?: string;
};

/**
 * Normalizes contract configuration to DetailedContractConfig format
 * @param contractConfig - The contract configuration (string or object)
 * @returns Normalized DetailedContractConfig
 */
function normalizeContractConfig(contractConfig: SimpleContractConfig | ContractConfig): ContractConfig {
    if (typeof contractConfig === 'string') {
        return {
            address: contractConfig,
        };
    }

    return {
        address: contractConfig.address,
        mode: contractConfig.mode,
    };
}

/**
 * Normalizes all contracts in a networks configuration
 * @param networksConfig - The networks configuration
 * @returns Normalized networks configuration with DetailedContractConfig
 */
function normalizeNetworksConfiguration(networksConfig?: NetworksConfiguration): NetworksConfiguration | undefined {
    if (!networksConfig) {
        return undefined;
    }

    const normalized: NetworksConfiguration = {};

    for (const [networkName, networkConfig] of Object.entries(networksConfig)) {
        normalized[networkName] = {
            ...networkConfig,
            contracts: {},
        };

        if (networkConfig.contracts) {
            for (const [contractName, contractConfig] of Object.entries(networkConfig.contracts)) {
                normalized[networkName].contracts[contractName] = normalizeContractConfig(contractConfig);
            }
        }
    }

    return normalized;
}

const defaults = {
    logLevel: 3,

    fw: {
        integ: {
            include: [],
            exclude: ['**/node_modules/*'],
            overrideDefaults: false,
        },
    },
};

export default async () => {
    let localConfig: CLIConfig = {};
    try {
        localConfig = (await import(LOCAL_CONFIG_PATH)) || {};
    } catch (_err) {
        // No valid local config.
    }

    const overrideDefaults = !!localConfig?.fw?.integ?.overrideDefaults;
    const overrides = {
        logLevel: defaults.logLevel,

        fw: {
            integ: {
                ...defaults.fw.integ,
                exclude: overrideDefaults ? [] : defaults.fw.integ.exclude,
            },
        },
    };

    const config: CLIConfig = {
        logLevel: localConfig?.logLevel || overrides.logLevel,

        fw: {
            integ: {
                ...overrides.fw.integ,
                ...(localConfig?.fw?.integ || {}),
                exclude: overrides.fw.integ.exclude
                    .concat(localConfig?.fw?.integ?.exclude || [])
                    .map(pattern => join(pattern)),
            },
        },

        networks: normalizeNetworksConfiguration(localConfig?.networks),
        subnets: localConfig?.subnets || {},
        privateKey: process.env.VENN_PRIVATE_KEY,
        protocolMetadata: process.env.PROTOCOL_METADATA,
    };

    return config;
};

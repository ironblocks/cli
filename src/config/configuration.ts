import { join } from 'path';
import { cwd } from 'process';

const CONFIG_FILE_NAME = 'venn.config.json';
const LOCAL_CONFIG_PATH = join(cwd(), CONFIG_FILE_NAME);

type NetworksConfiguration = {
    [network: string]: {
        contracts: Array<string>;
    };
};

type CLIConfig = {
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
    privateKey?: string;
};

const defaults = {
    logLevel: 3,

    fw: {
        integ: {
            include: [],
            exclude: ['**/node_modules/*'],
            overrideDefaults: false
        }
    }
};

export default async () => {
    let localConfig: CLIConfig = {};
    try {
        localConfig = (await import(LOCAL_CONFIG_PATH)) || {};
    } catch (err) {
        // No valid local config.
    }

    const overrideDefaults = !!localConfig?.fw?.integ?.overrideDefaults;
    const overrides = {
        logLevel: defaults.logLevel,

        fw: {
            integ: {
                ...defaults.fw.integ,
                exclude: overrideDefaults ? [] : defaults.fw.integ.exclude
            }
        }
    };

    const config: CLIConfig = {
        logLevel: localConfig?.logLevel || overrides.logLevel,

        fw: {
            integ: {
                ...overrides.fw.integ,
                ...(localConfig?.fw?.integ || {}),
                exclude: overrides.fw.integ.exclude.concat(localConfig?.fw?.integ?.exclude || []).map(pattern => join(pattern))
            }
        },

        networks: localConfig?.networks || undefined,
        privateKey: process.env.VENN_PRIVATE_KEY
    };

    return config;
};

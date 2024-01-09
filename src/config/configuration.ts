// Builtin.
import { join } from 'path';
import { cwd } from 'process';

const CONFIG_FILE_NAME = '.ib.cli.js';
const LOCAL_CONFIG_PATH = join(cwd(), CONFIG_FILE_NAME);

type CLIConfig = {
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
};

const defaults = {
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
    } catch (err) {
        // No valid local config.
    }

    const overrideDefaults = !!localConfig?.fw?.integ?.overrideDefaults;
    const overrides = {
        fw: {
            integ: {
                ...defaults.fw.integ,
                exclude: overrideDefaults ? [] : defaults.fw.integ.exclude,
            },
        },
    };

    const config: CLIConfig = {
        fw: {
            integ: {
                ...overrides.fw.integ,
                ...(localConfig?.fw?.integ || {}),
                exclude: overrides.fw.integ.exclude
                    .concat(localConfig?.fw?.integ?.exclude || [])
                    .map((pattern) => join(pattern)),
            },
        },
    };

    return config;
};

// Builtin.
import { join } from 'path';
import { cwd } from 'process';

const CONFIG_FILE_NAME = '.ib.cli.js';
const LOCAL_CONFIG_PATH = join(cwd(), CONFIG_FILE_NAME);

type CLIConfig = {
    // List of solidity contract files and directories to ignore when integrating the firewall.
    fwIntegIgnore?: string[];
    // Whether to ignore the default firewall integration ignore list.
    fwIntegIgnoreOverrideDefaults?: boolean;
};

const defaults: CLIConfig = {
    fwIntegIgnore: ['node_modules'],
};

export default async () => {
    let localConfig: CLIConfig = {};
    try {
        localConfig = (await import(LOCAL_CONFIG_PATH)) ?? {};
    } catch (err) {
        // No valid local config.
    }

    const fwIntegIgnoreDefaults = localConfig?.fwIntegIgnoreOverrideDefaults
        ? []
        : defaults.fwIntegIgnore;

    const config = {
        fwIntegIgnore: fwIntegIgnoreDefaults
            .concat(localConfig.fwIntegIgnore ?? [])
            .map((pattern) => join(cwd(), pattern)),
    };

    return config;
};

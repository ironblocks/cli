// Builtin.
import { join } from 'path';
import { cwd } from 'process';

const CONFIG_FILE_NAME = '.ib.cli.js';
const LOCAL_CONFIG_PATH = join(cwd(), CONFIG_FILE_NAME);

type CLIConfig = {
    // Allow list of solidity contract files and directories to consider when integrating with the firewall.
    fwIntegInclude?: string[];
    // Ignore list of solidity contract files and directories to exclude when integrating with the firewall.
    fwIntegExclude?: string[];
    // Whether to ignore the default firewall integration exclude list.
    fwIntegExcludeOverrideDefaults?: boolean;
};

const defaults: CLIConfig = {
    fwIntegExclude: ['node_modules'],
};

export default async () => {
    let localConfig: CLIConfig = {};
    try {
        localConfig = (await import(LOCAL_CONFIG_PATH)) ?? {};
    } catch (err) {
        // No valid local config.
    }

    const fwIntegExcludeDefaults = localConfig?.fwIntegExcludeOverrideDefaults
        ? []
        : defaults.fwIntegExclude;

    const config: CLIConfig = {
        fwIntegExclude: fwIntegExcludeDefaults
            .concat(localConfig.fwIntegExclude ?? [])
            .map((pattern) => join(cwd(), pattern)),
    };

    return config;
};

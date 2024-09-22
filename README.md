<!-- omit from toc -->
# Venn CLI

[![NPM Version](https://img.shields.io/npm/v/@vennbuild/cli?style=flat-square)](https://www.npmjs.com/~vennbuild)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-blue?logo=discord&logoColor=white&style=flat-square)](https://discord.com/channels/1065679814289268929)
[![X](https://img.shields.io/twitter/follow/VennBuild?style=social&label=Follow)](https://twitter.com/VennBuild)

![venn enable](https://storage.googleapis.com/venn-engineering/venn-cli/venn.gif)

## 🚀 Quick Start

Follow these steps to secure your contracts with Venn:

1. Install the CLI globally by running:

    ```shell
    npm i -g @vennbuild/cli
    ```

2. Auto-import the Firewall into your smart contracts by running:

    ```shell
    venn fw integ -d contracts
    ```

3. Deploy your contracts like you normally would to any network

4. Finally, connect your contracts to Venn by running:

    ```shell
    venn enable --network holesky
    ```

<!-- omit from toc -->
## Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [📚 Usage](#-usage)
  - [Firewall Integration](#firewall-integration)
  - [Venn Integration](#venn-integration)
- [⚙️ Configuration File](#️-configuration-file)
  - [Firewall Configuration](#firewall-configuration)
  - [Venn Configuration](#venn-configuration)
- [⚡ Available Commands](#-available-commands)
  - [`venn`](#venn)
  - [`venn fw integ`](#venn-fw-integ)
  - [`venn enable`](#venn-enable)
  - [`venn disable`](#venn-disable)
- [💬 Support \& Documentation](#-support--documentation)
- [📜 License](#-license)

## 📦 Installation

```bash
npm install -g @vennbuild/cli
```

> 💡 **Note:** Venn CLI is compatible with Solidity versions `>= 0.8`

## 📚 Usage

There are 3 steps to the integration.  

1. First, add the Firewall SDK to your smart contracts, and deploy them as your would normally deploy to any network.

2. Next, connect your deployed smart contracts to Venn.

3. Now that your project is secure, only approved transactions will go through.  
    To approve transactions, make sure to add the [**Venn DApp SDK**](https://www.npmjs.com/package/@vennbuild/venn-dapp-sdk) to your DApp's frontend.

### Firewall Integration

This integration will add the Firewall SDK to your smart contracts, making sure that they import the relevant modifiers, and apply the modifiers on external functions.

<!-- omit from toc -->
#### Automatic Integration With CLI

Auto-import the Firewall SDK into all of your smart contracts in one go by running:

```shell
venn fw integ -d contracts
```

This command will scan all your smart contracts under the `contracts` folder, and add an import of the `VennFirewallConsumer` Firewall SDK.

<!-- omit from toc -->
##### Before

```solidity
pragma solidity ^0.8;

contract MyContract {
    
    myMethod() {
        ...
    }
}
```

<!-- omit from toc -->
##### After

```solidity
pragma solidity ^0.8;

import {VennFirewallConsumer} from "@ironblocks/firewall-consumer/contracts/consumers/VennFirewallConsumer.sol";

contract MyContract is VennFirewallConsumer {

    myMethod() firewallProtected {
        ...
    }
}
```

See the [**Available Commands**](#-available-commands) section below for additional integration options

### Venn Integration

This integration will connect your Firewall protected smart contracts to the Venn Network onchain. It does this by sending setup transactions onchain to register your smart contracts with Venn.

<!-- omit from toc -->
#### Prerequisites

1. Make sure your smart contracts are deployed and that you have completed the [**Firewall Integration**](#firewall-integration) step above

2. You will need your private key for this step

<!-- omit from toc -->
#### Configuration

1. Create a new file called **`venn.config.json`**

2. Add the following configuration snippet to it:

    ```json
    {
        "networks": {
            "holesky": {
                "contracts": {
                    "MyContract1": "0x1234abcd1234abcd1234abcd1234abcd1234abcd",
                    "MyContract2": "0x1234abcd1234abcd1234abcd1234abcd1234abcd",
                }
            }
        }
    }
    ```

    - Each key in the `contracts` object is the **Name** of the contract
    - Each value in the `contracts` object is the **Address** of the contract

3. Create a new environment variable called `VENN_PRIVATE_KEY` with the **private key that deployed your smart contracts**

    > ⚠️  
    > **IMPORTANT:** This key must be the same key that deployed the smart contracts

<!-- omit from toc -->
#### Connect To Venn

Run the following command to connect your Firewall protected smart contracts to Venn:

```shell
venn enable --holesky
```

> **NOTE:** After successfully connecting to Venn, the address of your newly deployed Venn Security Policy will be stored in `venn.config.json`.

## ⚙️ Configuration File

Venn CLI uses `venn.config.json` as it's configuration file, expected at the root folder of your project.

Overall, the configuration file has the following structure:

```json
{
    "fw": { /* ... */ },
    "network": { /* ... */ }
}
```

### Firewall Configuration

For the Firewall integration, you can configure which folders to include or exclude from the integration, using the following configuration:

```json
{
    "fw": {
        "integ": {
            "include": ["my/contracts/folder"],
            "exclude": ["tests/fixtures/**/*.sol"],
        }
    }
}
```

<!-- omit from toc -->
#### Include

Acts as a whitelist.  
If this configuration is not empty, only files inside the configured folders will be integrated with the Firewall SDK.

<!-- omit from toc -->
#### Exclude

Acts as a blacklist.  
If this configuration is not empty, files inside the configured folders will not be integrated.

### Venn Configuration

For the Venn Integration, you configure which **`networks`** to integrate with, and list the contracts that you have deployed per networks:

<!-- omit from toc -->
#### Smart Contracts

```json
{
    "networks": {
        "holesky": {
            "contracts": {
                "MyContract1": "0x1234abcd1234abcd1234abcd1234abcd1234abcd",
                "MyContract2": "0x1234abcd1234abcd1234abcd1234abcd1234abcd",
            }
        }
    }
}
```

Note that the `key` is the name of the contract, and the `value` is the address of the contract.

<!-- omit from toc -->
#### Private Key

When Venn CLI registers your smart contracts with Venn onchain, it sends several setup transactions for this registration to happen.

The account that signs these transactions is provided to the CLI by setting the following environment variable:

- `VENN_PRIVATE_KEY`  
    The account that owns the deployed contracts

## ⚡ Available Commands

### `venn`

This is the root command.  

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Available Options
<!-- markdownlint-enable -->

- `--help`  
    show help information

- `--version`  
    show version information

### `venn fw integ`

Subcommand for managing the Firewall SDK integration with your smart contracts.

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Available Options
<!-- markdownlint-enable -->

- `-f, --file <file path>`  
    specify a single smart contract file for the integration

- `-d, --dir <folder path>`  
    specify a directory of smart contracts for the integration

- `-r, --rec`  
    if specified, will recursively look in `<folder path>` from `--dir`

- `-v, --verbose`  
    show verbose logging

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Examples
<!-- markdownlint-enable -->

<!-- omit from toc -->
##### A single contract

```shell
venn fw integ -f contracts/MyContract.sol
```

<!-- omit from toc -->
##### A single folder

```shell
venn fw integ -d contracts/vault
```

<!-- omit from toc -->
##### All contracts

```shell
venn fw integ --r -d contracts
```

### `venn enable`

Register your Firewall protected smart contracts with Venn.

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Available Options
<!-- markdownlint-enable -->

- `--network <network>`
    the network where your smart contracts are deployed to

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Examples
<!-- markdownlint-enable -->

<!-- omit from toc -->
##### Enable Venn

```shell
venn enable --network holskey
```

### `venn disable`

Unregister your Firewall protected smart contracts from Venn.

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Available Options
<!-- markdownlint-enable -->

- `--network <network>`
    the network where your smart contracts are deployed to

<!-- markdownlint-disable -->
<!-- omit from toc -->
#### Examples
<!-- markdownlint-enable -->

<!-- omit from toc -->
##### Disable Venn

```shell
venn disable --network holskey
```

## 💬 Support & Documentation

We're here to help.  

- Join the discussion on Discord: [Venn Discord](https://discord.gg/97cg6Qhg)

- Read the docs: [Venn Documentation](https://docs.venn.build)

## 📜 License

Venn CLI is released under the [MIT License](LICENSE).

The Venn CLI showcases how to easily integrate with Ironblocks' Firewall.

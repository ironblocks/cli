<p align="center">
    <a href="https://www.ironblocks.com/" target="blank"><img src="https://app.ironblocks.com/assets/icons/ironblocks/logo.svg" width="200" alt="Ironblocks Logo" /></a>
</p>

<p align="center">
    <a href="https://www.npmjs.com/~ironblocks" target="_blank"><img src="https://img.shields.io/npm/v/@ironblocks/cli" alt="NPM Version" /></a>
    <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="Package License" /></a>
    <a href="https://discord.com/channels/1065679814289268929" target="_blank"><img src="https://img.shields.io/badge/Discord-blue?logo=discord&logoColor=white"></a>
    <a href="https://twitter.com/Ironblocks_" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>

## Description

This CLI tool will help you to interact and easily integrate with our ecosystem.

## Installation

```bash
$ npm install @ironblocks/cli -g
```

## Config

Customize default config by adding a `.ib.cli.js` file at the working directory from which you use the tool.

```js
module.exports = {
    fw: {
        integ: {
            include: [],
            exclude: ['examples', 'also/**.sol'],
            overrideDefaults: false,
        },
    },
};
```

| options                          | type        | required | description                                                                                           | defaults              |
|----------------------------------| ----------- | -------- | ------------------------------------------------------------------------------------------------------|-----------------------|
| fw.integ.include                 | string[]    | false    | allow list of solidity contract files and directories to consider when integrating with the firewall  | -                     |
| fw.integ.exclude                 | string[]    | false    | ignore list of solidity contract files and directories to exclude when integrating with the firewall  | ["**/node_modules/*"] |
| fw.integ.overrideDefaults        | boolean     | false    | whether to ignore the default firewall integration exclude list                                       | false                 |

## Commands

#### Usage Example

```bash
# List available commands
$ ib --help
```

### Firewall Integration

| options        | type       | required | description                                                                                |
|----------------| ---------- | -------- | -------------------------------------------------------------------------------------------|
| -f --file      | string     | false    | path to a solidity file to integrate with the firewall                                     |
| -d --dir       | string     | false    | path to directory containing solidity files to integrate with the firewall (non recursive) |
| -r --rec       | flag       | false    | special flag for the "-d" option, indicating whether should visit subdirectories or not    |
| -v --verbose   | flag       | false    | execute the command in "verbose" mode printing additional details along the execution      |
| -i --internal  | flag       | false    | whether to add firewall protection for "internal" functions                                |

#### Usage Example

```bash
# Integrating a specific file with the firewall
$ ib fw integ -f /path/to/file.sol

# Integrating all files in a directory
$ ib fw integ -d /path/to/contracts

# Integrating all files in a directory and its subdirectories
$ ib fw integ -d /path/to/contracts -r
```

## License

Ironblocks Firewall Contracts are released under the [MIT License](LICENSE).

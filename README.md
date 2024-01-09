<p align="center">
    <a href="https://www.ironblocks.com/" target="blank"><img src="https://www.ironblocks.com/logo.svg" width="200" alt="Ironblocks Logo" /></a>
</p>

<p align="center">
    <a href="https://www.npmjs.com/~ironblocks" target="_blank"><img src="https://img.shields.io/npm/v/@ironblocks/cli" alt="NPM Version" /></a>
    <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="Package License" /></a>
    <a href="https://discord.com/channels/1065679814289268929" target="_blank"><img src="https://img.shields.io/badge/Discord-blue?logo=discord&logoColor=white"></a>
    <a href="https://twitter.com/Ironblocks_" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>

## Description

This CLI tool will help you to interact and easily integrate with our ecosystem.

## Compatibility

Solidity versions `>= 0.8 < 0.8.20`.

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
            exclude: [
                'examples',
                'more-examples/**/*.sol'
            ],
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

| options           | type   | required | description                                                                                |
|-------------------| -------| ---------| -------------------------------------------------------------------------------------------|
| -f<br> --file     | string | false    | path to a solidity file to integrate with the firewall                                     |
| -d<br> --dir      | string | false    | path to directory containing solidity files to integrate with the firewall (non recursive) |
| -r<br> --rec      | flag   | false    | special flag for the "-d" option, indicating whether should visit subdirectories or not    |
| -v<br> --verbose  | flag   | false    | execute the command in "verbose" mode printing additional details along the execution      |
| -i<br> --internal | flag   | false    | whether to add firewall protection for "internal" functions                                |
| -m<br> --modifiers| string | false    | set advanced modifiers. [options](#advanced-modifiers)                |

#### Advanced Modifiers
- `invariantProtected` - For applying the subscribed invariant policy.

#### Usage Example

```bash
# Integrating a specific file with the firewall
$ ib fw integ -f /path/to/file.sol

# Integrating all files in a directory
$ ib fw integ -d /path/to/contracts

# Integrating all files in a directory and its subdirectories
$ ib fw integ -d /path/to/contracts -r

# Integrate internall functions as well
$ ib fw integ -d /path/to/contracts -i

# Integrate internall functions and use the "invariantProtected" modifier where possible
$ ib fw integ -d /path/to/contracts -i -m invariantProtected
```

## License

Ironblocks Firewall Contracts are released under the [MIT License](LICENSE).

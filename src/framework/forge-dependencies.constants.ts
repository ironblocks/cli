// prettier-ignore
export const FORGE_DEPENDENCIES = [
    {
        name: 'ironblocks/onchain-firewall',
        installName: 'ironblocks/onchain-firewall=ironblocks/onchain-firewall',
        remappings: ['@ironblocks/firewall-consumer/=lib/ironblocks/onchain-firewall/packages/firewall-consumer/']
    },

    {
        name: 'OpenZeppelin/openzeppelin-contracts',
        installName: 'OpenZeppelin/openzeppelin-contracts',
        remappings: [
            '@openzeppelin/=lib/openzeppelin-contracts/',
            'ds-test/=lib/openzeppelin-contracts/lib/forge-std/lib/ds-test/src/',
            'erc4626-tests/=lib/openzeppelin-contracts/lib/erc4626-tests/',
            'forge-std/=lib/forge-std/src/',
            'openzeppelin-contracts/=lib/openzeppelin-contracts/',
            'openzeppelin/=lib/openzeppelin-contracts/contracts/'
        ]
    }
];

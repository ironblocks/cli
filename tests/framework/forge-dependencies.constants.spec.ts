import { FORGE_DEPENDENCIES } from '@/framework/forge-dependencies.constants';

describe('Forge Dependencies', () => {
    describe('@ironblocks/firewall-consumer', () => {
        const firewallConsumer = FORGE_DEPENDENCIES.find(dep => dep.name === '@ironblocks/firewall-consumer');

        it('is defined as a dependency', () => {
            expect(firewallConsumer).toBeDefined();
        });

        it('has the correct name', () => {
            expect(firewallConsumer.name).toBe('@ironblocks/firewall-consumer');
        });

        it('has the correct install name', () => {
            expect(firewallConsumer.installName).toBe('@ironblocks/firewall-consumer=ironblocks/firewall-consumer');
        });
    });

    describe('OpenZeppelin/openzeppelin-contracts', () => {
        const openZeppelinContracts = FORGE_DEPENDENCIES.find(
            dep => dep.name === 'OpenZeppelin/openzeppelin-contracts'
        );

        it('is defined as a dependency', () => {
            expect(openZeppelinContracts).toBeDefined();
        });

        it('has the correct name', () => {
            expect(openZeppelinContracts.name).toBe('OpenZeppelin/openzeppelin-contracts');
        });

        it('has the correct install name', () => {
            expect(openZeppelinContracts.installName).toBe('OpenZeppelin/openzeppelin-contracts');
        });
    });
});

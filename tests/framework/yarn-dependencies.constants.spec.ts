import { YARN_DEPENDENCIES } from '@/framework/yarn-dependencies.constatns';

describe('Yarn Dependencies', () => {
    describe('@ironblocks/firewall-consumer', () => {
        const firewallConsumer = YARN_DEPENDENCIES.find(dep => dep.name === '@ironblocks/firewall-consumer');

        it('is defined as a dependency', () => {
            expect(firewallConsumer).toBeDefined();
        });

        it('has the correct name', () => {
            expect(firewallConsumer.name).toBe('@ironblocks/firewall-consumer');
        });

        it('has the correct install name', () => {
            expect(firewallConsumer.installName).toBe('@ironblocks/firewall-consumer');
        });
    });
});

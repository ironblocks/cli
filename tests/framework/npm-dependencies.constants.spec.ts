import { NPM_DEPENDENCIES } from '@/framework/npm-dependencies.constatns';

describe('NPM Dependencies', () => {
    describe('@ironblocks/firewall-consumer', () => {
        const firewallConsumer = NPM_DEPENDENCIES.find(dep => dep.name === '@ironblocks/firewall-consumer');

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

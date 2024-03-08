import {
    FOUNDRY_DEPENDENCIES,
    FOUNDRY_DEPENDENCIES_INSTALL_COMMAND,
    FOUNDRY_DEPENDENCIES_LIST_COMMAND,
    HARDHAT_DEPENDENCIES,
    HARDHAT_DEPENDENCIES_INSTALL_COMMAND,
    HARDHAT_DEPENDENCIES_LIST_COMMAND
} from '@/dependencies/dependencies.constants';

describe('Dependencies Constants', () => {
    describe('Hardhat', () => {
        it('includes the correct dependencies', () => {
            expect(HARDHAT_DEPENDENCIES).toEqual(['@ironblocks/firewall-consumer']);
        });

        it('has the correct list command', () => {
            expect(HARDHAT_DEPENDENCIES_LIST_COMMAND).toBe('npm ls');
        });

        it('has the correct install command', () => {
            expect(HARDHAT_DEPENDENCIES_INSTALL_COMMAND).toBe('npm install');
        });
    });

    describe('Foundry', () => {
        it('includes the correct dependencies', () => {
            expect(FOUNDRY_DEPENDENCIES).toEqual(['ironblocks/firewall-consumer']);
        });

        it('has the correct list command', () => {
            expect(FOUNDRY_DEPENDENCIES_LIST_COMMAND).toBe('cat .gitmodules | grep');
        });

        it('has the correct install command', () => {
            expect(FOUNDRY_DEPENDENCIES_INSTALL_COMMAND).toBe('forge install');
        });
    });
});

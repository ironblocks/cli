import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/integration/integration.command.descriptor';

describe('Command Descriptor: integ', () => {
    it('is named "integ"', () => {
        expect(NAME).toBe('integ');
    });

    it('is desribed with our company name and logo', () => {
        expect(DESCRIPTION).toBe("Integrate your contracts with Ironblocks' firewall");
    });

    it('has the correct full name', () => {
        expect(FULL_NAME).toBe('ib fw integ');
    });
});

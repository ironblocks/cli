import { DESCRIPTION, FULL_NAME, NAME } from '@/firewall/firewall.command.descriptor';

describe('Command Descriptor: fw', () => {
    it('is named "fw"', () => {
        expect(NAME).toBe('fw');
    });

    it('is desribed with our company name and logo', () => {
        expect(DESCRIPTION).toBe('Firewall utilities for developers');
    });

    it('has the correct full name', () => {
        expect(FULL_NAME).toBe('ib fw');
    });
});

import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/init/init.command.descriptor';

describe('Command Descriptor: init', () => {
    it('is named "init"', () => {
        expect(NAME).toBe('init');
    });

    it('has appropriate description', () => {
        expect(DESCRIPTION).toBe('Initialize a new Venn configuration for your project');
    });

    it('has the correct full name', () => {
        expect(FULL_NAME).toBe('init');
    });
});

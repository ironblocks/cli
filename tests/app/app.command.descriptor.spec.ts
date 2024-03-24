import { DESCRIPTION, FULL_NAME, NAME } from '@/app/app.command.descriptor';

describe('Command Descriptor: ib', () => {
    it('is named "ib"', () => {
        expect(NAME).toBe('ib');
    });

    it('is desribed with our company name and logo', () => {
        expect(DESCRIPTION).toBe(`\
    🟧
  🟧      Ironblocks CLI
    🟧\
`);
    });

    it('does not have parent (i.e. it is the root command)', () => {
        expect(FULL_NAME).toBe(NAME);
    });
});

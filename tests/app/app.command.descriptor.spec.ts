import { DESCRIPTION, FULL_NAME, NAME } from '@/app/app.command.descriptor';

describe('Command Descriptor: venn', () => {
    it('is named "venn"', () => {
        expect(NAME).toBe('venn');
    });

    it('is desribed with our company name and logo', () => {
        expect(DESCRIPTION).toBe(`\
    🟧
  🟧      Venn CLI
    🟧\
`);
    });

    it('does not have parent (i.e. it is the root command)', () => {
        expect(FULL_NAME).toBe(NAME);
    });
});

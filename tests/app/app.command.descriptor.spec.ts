import * as colors from 'colors';
import { DESCRIPTION, FULL_NAME, NAME } from '@/app/app.command.descriptor';

describe('Command Descriptor: venn', () => {
    it('is named "venn"', () => {
        expect(NAME).toBe('venn');
    });

    it('is desribed with our company name and logo', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('../../package.json');
        expect(DESCRIPTION).toBe(`Venn CLI ${colors.cyan('v' + pkg.version)}`);
    });

    it('does not have parent (i.e. it is the root command)', () => {
        expect(FULL_NAME).toBe(NAME);
    });
});

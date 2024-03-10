import { OPTIONS } from '@/app/app.command.options.descriptors';

describe('App Command Options Descriptors', () => {
    describe('--version', () => {
        it('it is defined', () => {
            expect(OPTIONS.VERSION).toBeDefined();
        });

        it('has defines the correct flags', () => {
            expect(OPTIONS.VERSION.FLAGS).toBe('-v, --version');
        });

        it('has the correct description', () => {
            expect(OPTIONS.VERSION.DESCRIPTION).toBe('Show version information');
        });
    });
});

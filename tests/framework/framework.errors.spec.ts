import { FrameworkError } from '@/framework/framework.errors';

describe('Framework Errors', () => {
    describe('FrameworkError()', () => {
        it('is an error', () => {
            const error = new FrameworkError('some message');
            expect(error).toBeInstanceOf(Error);
        });

        it('is called FrameworkError', () => {
            const error = new FrameworkError('some message');
            expect(error.name).toBe('FrameworkError');
        });

        it('passes the message to the error', () => {
            const error = new FrameworkError('some message');
            expect(error.message).toBe('some message');
        });
    });
});

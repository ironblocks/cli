import { DependenciesError } from '@/framework/dependencies.errors';

describe('Dependencies Errors', () => {
    describe('DependenciesError()', () => {
        it('is an error', () => {
            const error = new DependenciesError('some message');
            expect(error).toBeInstanceOf(Error);
        });

        it('is called DependenciesError', () => {
            const error = new DependenciesError('some message');
            expect(error.name).toBe('DependenciesError');
        });

        it('passes the message to the error', () => {
            const error = new DependenciesError('some message');
            expect(error.message).toBe('some message');
        });
    });
});

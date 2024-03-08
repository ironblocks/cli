import { DependencyError } from '@/dependencies/dependencies.errors';

describe('Depencndencies Errors', () => {
    it('extends the Error class', () => {
        expect(DependencyError.prototype).toBeInstanceOf(Error);
    });

    it('has the correct name', () => {
        const error = new DependencyError('test');
        expect(error.name).toBe('DependencyError');
    });
});

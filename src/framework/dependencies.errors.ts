export class DependenciesError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DependenciesError';
    }
}

export class MultiSigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MultiSigError';
    }
}

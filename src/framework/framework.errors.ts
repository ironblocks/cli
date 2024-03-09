export class FrameworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FrameworkError';
    }
}

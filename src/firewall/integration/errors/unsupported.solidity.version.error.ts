export class UnsupportedSolidityVersionError extends Error {
    public readonly version: string;

    constructor(value: string) {
        super();
        this.version = value;
    }
}

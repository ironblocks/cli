export class PromptError extends Error {
    /**
     * Overiding "toString" to prevent NestJS printing the error with "Error: " prefix.
     *
     * @returns
     */
    toString(): string {
        return this.message;
    }
}

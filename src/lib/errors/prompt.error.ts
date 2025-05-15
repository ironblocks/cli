export class PromptError extends Error {
    /**
     * Overriding "toString" to prevent NestJS printing the error with "Error: " prefix.
     *
     * @returns the error message
     */
    toString(): string {
        return this.message;
    }
}

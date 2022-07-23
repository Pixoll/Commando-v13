/**
 * Has a message that can be considered user-friendly
 * @augments Error
 */
export default class FriendlyError extends Error {
    /**
     * @param message - The error message
     */
    public constructor(message: string) {
        super(message);
        this.name = 'FriendlyError';
    }
}
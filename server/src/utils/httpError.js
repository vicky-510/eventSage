/** An error whose message is safe to send to the client as-is. */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code to respond with.
   * @param {string} message Client-safe error message.
   */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.publicMessage = message;
  }
}

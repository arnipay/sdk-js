export class GatewayError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 0, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'GatewayError';
    this.statusCode = statusCode;
    this.errors = errors;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GatewayError);
    }
  }
}

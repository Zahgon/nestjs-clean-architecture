/**
 * Payload carried by an ApiError. Either a bare message, or an object whose
 * `message` drives the client-visible text (a string, or a list of validation
 * messages). Anything else on the object is part of the payload and is used by
 * the handlers that know how to read it (the health check result, for example).
 */
export type ApiErrorPayload =
  | string
  | { message?: string | string[]; [key: string]: unknown };

/**
 * An error that carries the HTTP status the client should see.
 *
 * `err.status` is Express's own convention - body-parser, http-errors and the
 * default Express error handler all speak it - so this stays out of the way of
 * ordinary middleware. Errors that do NOT carry it (a plain `Error` thrown from
 * a domain service, a `PayloadTooLargeError` from body-parser) deliberately
 * fall through to the 500 branch of the error handler.
 */
export class ApiError extends Error {
  readonly status: number;

  readonly payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(typeof payload === 'string' ? payload : String(payload.message ?? ''));
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

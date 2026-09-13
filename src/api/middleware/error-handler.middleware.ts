import { ErrorRequestHandler } from 'express';
import { ApiError } from '@application/errors/api-error';
import { ResponseService } from '@application/services/response.service';

const mapExternalError = (error: unknown): unknown =>
  error instanceof SyntaxError || error instanceof RangeError
    ? new ApiError(400, error.message)
    : error;

const codeForStatus = (status: number): string => {
  switch (status) {
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'AUTHORIZATION_ERROR';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'HTTP_ERROR';
  }
};

/**
 * The single terminal error handler. It never logs.
 *
 * A body-parser SyntaxError becomes a 400 carrying the parser's own message, so
 * malformed JSON reads as a validation failure. Anything else without a status
 * - a plain Error out of a domain service - leaks its message verbatim on a
 * 500 under APPLICATION_ERROR.
 */
export const createErrorHandler = (
  responseService: ResponseService,
): ErrorRequestHandler => {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const mapped = mapExternalError(error);

    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = null;

    if (mapped instanceof ApiError) {
      status = mapped.status;
      const { payload } = mapped;
      const payloadMessage =
        typeof payload === 'string' ? payload : payload.message;

      if (status === 400) {
        if (Array.isArray(payloadMessage)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          details = payloadMessage;
        } else if (typeof payloadMessage === 'string') {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          details = [payloadMessage];
        } else {
          message = 'Bad request';
          code = 'BAD_REQUEST';
        }
      } else {
        if (typeof payload === 'string') {
          message = payload;
        } else if (payloadMessage) {
          message = Array.isArray(payloadMessage)
            ? payloadMessage[0]
            : payloadMessage;
        }

        code = codeForStatus(status);
        if (status === 422) {
          details = payloadMessage;
        }
      }
    } else if (mapped instanceof Error) {
      message = mapped.message;
      code = 'APPLICATION_ERROR';
    }

    const body = responseService.error(message, code, details);
    res.status(status).json(responseService.withRequest(body, req));
  };
};

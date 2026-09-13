import { NextFunction, Request, Response } from 'express';
import { ApiError } from '@application/errors/api-error';

/**
 * Registered as ordinary middleware after every router, so it also swallows the
 * automatic OPTIONS reply Express would otherwise send: the stack never runs
 * out, and unmatched requests come back as the JSON error envelope rather than
 * Express's HTML page.
 */
export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new ApiError(404, `Cannot ${req.method} ${req.originalUrl}`));
};

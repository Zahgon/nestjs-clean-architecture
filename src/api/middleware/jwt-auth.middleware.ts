import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@constants';
import { ApiError } from '@application/errors/api-error';

/**
 * Bearer token out of the Authorization header and nothing else - never a
 * cookie. Missing, malformed, wrongly signed and expired tokens all land on the
 * same 401 body, so a client cannot tell them apart.
 */
export const createJwtAuth = (): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const [scheme, token] =
      typeof header === 'string' ? header.split(' ') : [];

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      next(new ApiError(401, 'Unauthorized'));
      return;
    }

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (_error) {
      next(new ApiError(401, 'Unauthorized'));
      return;
    }

    if (typeof payload === 'string') {
      next(new ApiError(401, 'Unauthorized'));
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
    next();
  };
};

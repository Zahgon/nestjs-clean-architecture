import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '@application/errors/api-error';
import { Role } from '@domain/entities/enums/role.enum';

export const requireRoles = (...requiredRoles: Role[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { user } = req;

    if (requiredRoles.some((role) => user.roles?.includes(role))) {
      next();
      return;
    }

    next(new ApiError(403, 'Forbidden resource'));
  };
};

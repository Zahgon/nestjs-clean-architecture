import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '@application/errors/api-error';
import { Constructor } from '@application/cqrs/command-bus';

/**
 * Depth-first, parents before their children, and every constraint message of a
 * node in the order class-validator recorded it. That ordering is visible to
 * clients, so it is not incidental.
 */
const flattenValidationErrors = (errors: ValidationError[]): string[] => {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }

  return messages;
};

export const validateBody = <TDto extends object>(
  dto: Constructor<TDto>,
): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const entity = plainToInstance(dto, req.body ?? {});
    const errors = await validate(entity, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      next(new ApiError(400, { message: flattenValidationErrors(errors) }));
      return;
    }

    req.body = instanceToPlain(entity);
    next();
  };
};

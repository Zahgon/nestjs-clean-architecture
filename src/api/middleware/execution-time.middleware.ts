import { NextFunction, Request, Response } from 'express';

export const executionTimeMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const now = Date.now();
  res.on('finish', () => {
    console.log(`Execution time... ${Date.now() - now}ms`);
  });
  next();
};

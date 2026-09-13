import { JwtPayload } from '@application/interfaces/authenticated-request.interface';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the jwt auth middleware before any protected handler runs. */
      user: JwtPayload;
      /** Set by RequestIdMiddleware on the auth and profile routers. */
      requestId?: string;
    }
  }
}

export {};

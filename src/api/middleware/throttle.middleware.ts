import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '@application/errors/api-error';

interface ThrottleRecord {
  hits: number;
  expiresAt: number;
  blockExpiresAt: number;
}

interface ThrottleDecision {
  blocked: boolean;
  remaining: number;
  secondsToReset: number;
  secondsToRetry: number;
}

/** Fixed window per route and client, held in process memory. */
export class ThrottlerStorage {
  private readonly records = new Map<string, ThrottleRecord>();

  consume(
    key: string,
    limit: number,
    ttl: number,
    blockDuration: number,
  ): ThrottleDecision {
    const now = Date.now();
    let record = this.records.get(key);

    if (record && record.blockExpiresAt > now) {
      return {
        blocked: true,
        remaining: 0,
        secondsToReset: 0,
        secondsToRetry: Math.ceil((record.blockExpiresAt - now) / 1000),
      };
    }

    if (!record || now >= record.expiresAt) {
      record = { hits: 0, expiresAt: now + ttl, blockExpiresAt: 0 };
      this.records.set(key, record);
    }

    record.hits += 1;

    if (record.hits > limit) {
      record.blockExpiresAt = now + blockDuration;
      return {
        blocked: true,
        remaining: 0,
        secondsToReset: 0,
        secondsToRetry: Math.ceil(blockDuration / 1000),
      };
    }

    return {
      blocked: false,
      remaining: limit - record.hits,
      secondsToReset: Math.ceil((record.expiresAt - now) / 1000),
      secondsToRetry: 0,
    };
  }
}

export type ThrottleFactory = (
  name: string,
  limit: number,
  ttl: number,
) => RequestHandler;

/**
 * Counters are per route name and per client address, so exhausting login does
 * not touch register. An allowed request carries the three X-RateLimit headers;
 * a blocked one carries Retry-After and none of them.
 */
export const createThrottleFactory = (
  storage: ThrottlerStorage,
): ThrottleFactory => {
  return (name: string, limit: number, ttl: number): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
      const decision = storage.consume(`${name}:${req.ip}`, limit, ttl, ttl);

      if (decision.blocked) {
        res.setHeader('Retry-After', String(decision.secondsToRetry));
        next(new ApiError(429, 'ThrottlerException: Too Many Requests'));
        return;
      }

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(decision.remaining));
      res.setHeader('X-RateLimit-Reset', String(decision.secondsToReset));
      next();
    };
};

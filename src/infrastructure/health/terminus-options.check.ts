import axios from 'axios';
import { ApiError } from '@application/errors/api-error';

export interface HealthIndicatorResult {
  [key: string]: { status: 'up' | 'down'; [detail: string]: unknown };
}

export interface HealthCheckResult {
  status: 'ok' | 'error';
  info: HealthIndicatorResult;
  error: HealthIndicatorResult;
  details: HealthIndicatorResult;
}

export class TerminusOptionsService {
  async check(): Promise<HealthCheckResult> {
    const results = await Promise.all([
      this.pingCheck('google', 'https://google.com'),
      this.checkHeap('memory_heap', 200 * 1024 * 1024),
      this.checkRSS('memory_rss', 3000 * 1024 * 1024),
    ]);

    const info: HealthIndicatorResult = {};
    const error: HealthIndicatorResult = {};
    const details: HealthIndicatorResult = {};

    for (const result of results) {
      for (const [key, value] of Object.entries(result)) {
        details[key] = value;
        if (value.status === 'up') {
          info[key] = value;
        } else {
          error[key] = value;
        }
      }
    }

    const status = Object.keys(error).length === 0 ? 'ok' : 'error';
    const checkResult: HealthCheckResult = { status, info, error, details };

    if (status === 'error') {
      throw new ApiError(503, { ...checkResult });
    }

    return checkResult;
  }

  private async pingCheck(
    key: string,
    url: string,
  ): Promise<HealthIndicatorResult> {
    try {
      await axios.get(url);
      return { [key]: { status: 'up' } };
    } catch (error) {
      return { [key]: { status: 'down', message: error.message } };
    }
  }

  private async checkHeap(
    key: string,
    heapUsedThreshold: number,
  ): Promise<HealthIndicatorResult> {
    const { heapUsed } = process.memoryUsage();
    if (heapUsed > heapUsedThreshold) {
      return {
        [key]: { status: 'down', message: 'Used heap exceeded the set threshold' },
      };
    }
    return { [key]: { status: 'up' } };
  }

  private async checkRSS(
    key: string,
    rssThreshold: number,
  ): Promise<HealthIndicatorResult> {
    const { rss } = process.memoryUsage();
    if (rss > rssThreshold) {
      return {
        [key]: { status: 'down', message: 'Used rss exceeded the set threshold' },
      };
    }
    return { [key]: { status: 'up' } };
  }
}

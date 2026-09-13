import { APP_HOST } from '@constants';

export class Context {
  module: string;
  method: string;
}

export class LoggerService {
  logger(message: any, context?: Context) {
    const now = new Date();
    const standard = {
      server: APP_HOST,
      type: 'INFO',
      timestamp: now.toISOString(),
      epochMs: now.getTime(),
    };
    const data = { ...standard, ...context, message };
    console.log(data);
  }

  err(message: any, context: Context) {
    const now = new Date();
    const standard = {
      server: APP_HOST,
      type: 'ERROR',
      timestamp: now.toISOString(),
      epochMs: now.getTime(),
    };
    const data = { ...standard, ...context, message };
    console.error(data);
  }

  warning(message: any, context: Context) {
    const now = new Date();
    const standard = {
      server: APP_HOST,
      type: 'WARNING',
      timestamp: now.toISOString(),
      epochMs: now.getTime(),
    };
    const data = { ...standard, ...context, message };
    console.warn(data);
  }
}

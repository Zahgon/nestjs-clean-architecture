import cookieParser from 'cookie-parser';
import express, { Express } from 'express';

import { createErrorHandler } from '@api/middleware/error-handler.middleware';
import { notFoundMiddleware } from '@api/middleware/not-found.middleware';
import { mountSwagger } from '@api/swagger';
import { CompositionRoot } from '../composition-root';

/**
 * Assembles the http surface over an already-built object graph. Kept apart
 * from main.ts so the same wiring can be driven without binding a port.
 */
export const createApp = (root: CompositionRoot): Express => {
  const app = express();

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // No OPTIONS route exists anywhere, so every OPTIONS request is a 404. This
  // has to sit ahead of the routers: once a Router's stack runs out on an
  // OPTIONS request it answers 200 with an Allow header by itself.
  app.options(/.*/, notFoundMiddleware);

  // Swagger configuration
  if (process.env.NODE_ENV !== 'production') {
    mountSwagger(app);
  }

  // /health is mounted outside the api prefix and outside versioning.
  app.use('/health', root.healthController.router);
  app.use('/api/v1/hello', root.helloController.router);
  app.use('/api/v1/metrics', root.metricsController.router);
  app.use('/api/v1/auth', root.authController.router);
  app.use('/api/v1/profile', root.profileController.router);

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(root.responseService));

  return app;
};

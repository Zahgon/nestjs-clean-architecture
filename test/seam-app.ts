import { Express } from 'express';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '@constants';
import { Role } from '@domain/entities/enums/role.enum';
import { createApp } from '../src/api/server';
import { CompositionRoot } from '../src/composition-root';

export interface SeamApp {
  app: Express;
  close: () => Promise<void>;
}

export const bootSeamApp = async (): Promise<SeamApp> => {
  const root = await CompositionRoot.create();

  return {
    app: createApp(root),
    close: () => root.connection.connection.close(),
  };
};

export const signToken = (
  claims: { sub: string; email?: string; roles?: Role[] },
  options: jwt.SignOptions = {},
): string =>
  jwt.sign(
    { email: 'seam@example.com', roles: [Role.USER], ...claims },
    JWT_SECRET,
    options,
  );

export const withoutTimestamp = (body: Record<string, unknown>) => {
  const { timestamp: _timestamp, ...rest } = body;
  return rest;
};

import { Express, Request, Response } from 'express';
import swaggerUi, { JsonObject } from 'swagger-ui-express';

const bearer = [{ bearer: [] as string[] }];

const jsonBody = (schema: JsonObject): JsonObject => ({
  required: true,
  content: { 'application/json': { schema } },
});

const object = (properties: JsonObject, required: string[]): JsonObject => ({
  type: 'object',
  properties,
  required,
});

const str: JsonObject = { type: 'string' };
const num: JsonObject = { type: 'number' };

export const openApiDocument: JsonObject = {
  openapi: '3.0.0',
  info: {
    title: 'NestJS Clean Architecture API',
    description: 'The NestJS Clean Architecture API description',
    version: '1.0',
    contact: {},
  },
  tags: [{ name: 'users', description: '' }],
  servers: [],
  components: {
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Register a new user',
        requestBody: jsonBody(
          object(
            { name: str, lastname: str, age: num, email: str, password: str },
            ['name', 'lastname', 'age', 'email', 'password'],
          ),
        ),
        responses: {
          '201': { description: 'User successfully registered.' },
          '400': { description: 'Bad Request.' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Log in a user',
        requestBody: jsonBody(
          object({ email: str, password: str }, ['email', 'password']),
        ),
        responses: {
          '201': { description: 'User successfully logged in.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Log out the current user',
        security: bearer,
        responses: {
          '201': { description: 'User successfully logged out.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/auth/change-password': {
      post: {
        tags: ['auth'],
        summary: 'Change password for the current user',
        security: bearer,
        requestBody: jsonBody(
          object({ oldPassword: str, newPassword: str }, [
            'oldPassword',
            'newPassword',
          ]),
        ),
        responses: {
          '201': { description: 'Password changed successfully.' },
          '400': { description: 'Bad Request.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/auth/refresh-token': {
      post: {
        tags: ['auth'],
        summary: 'Refresh access token',
        requestBody: jsonBody(object({ refresh_token: str }, ['refresh_token'])),
        responses: {
          '201': { description: 'New access token generated.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/auth/google': {
      get: {
        tags: ['auth'],
        summary: 'Initiate Google OAuth login',
        responses: { '302': { description: 'Redirect to Google.' } },
      },
    },
    '/api/v1/auth/google/redirect': {
      get: {
        tags: ['auth'],
        summary: 'Handle Google OAuth callback',
        responses: { '200': { description: 'Google authentication successful.' } },
      },
    },
    '/api/v1/auth/{id}': {
      get: {
        tags: ['auth'],
        summary: 'Get user profile by auth id',
        security: bearer,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: str },
        ],
        responses: {
          '200': { description: 'Returns user profile.' },
          '401': { description: 'Unauthorized.' },
          '404': { description: 'User not found.' },
        },
      },
      delete: {
        tags: ['auth'],
        summary: 'Delete user (auth + profile) by auth id',
        security: bearer,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: str },
        ],
        responses: {
          '200': { description: 'User deleted successfully.' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/profile/all': {
      get: {
        tags: ['profile'],
        summary: 'Get all users',
        security: bearer,
        responses: { '200': { description: 'Returns all users' } },
      },
    },
    '/api/v1/profile/admins': {
      get: {
        tags: ['profile'],
        summary: 'Get all admin users',
        security: bearer,
        responses: { '200': { description: 'Returns all admin users' } },
      },
    },
    '/api/v1/profile': {
      post: {
        tags: ['profile'],
        summary: 'Create a new user',
        security: bearer,
        requestBody: jsonBody(
          object({ authId: str, name: str, lastname: str, age: num }, [
            'authId',
            'name',
            'lastname',
            'age',
          ]),
        ),
        responses: {
          '201': { description: 'The user has been successfully created' },
        },
      },
    },
    '/api/v1/profile/{id}': {
      get: {
        tags: ['profile'],
        summary: 'Get user profile',
        security: bearer,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: str },
        ],
        responses: {
          '200': { description: 'Returns user profile.' },
          '401': { description: 'Unauthorized.' },
          '404': { description: 'Profile not found.' },
        },
      },
    },
    '/api/v1/profile/me': {
      put: {
        tags: ['profile'],
        summary: 'Update my profile',
        security: bearer,
        requestBody: jsonBody(
          object({ name: str, lastname: str, age: num }, []),
        ),
        responses: {
          '200': { description: 'Profile updated successfully' },
          '401': { description: 'Unauthorized.' },
        },
      },
    },
    '/api/v1/hello': {
      get: {
        tags: ['hello'],
        summary: 'Get hello message',
        responses: { '200': { description: 'Returns hello world message' } },
      },
    },
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Healthy.' },
          '503': { description: 'Degraded.' },
        },
      },
    },
    '/api/v1/metrics': {
      get: {
        tags: ['metrics'],
        summary: 'Prometheus metrics',
        responses: { '200': { description: 'Prometheus scrape payload.' } },
      },
    },
  },
};

/**
 * Mounted outside the prefix, the version, the envelope and the error handler.
 * `serve` only answers for asset paths it owns and otherwise calls next(), so
 * an unknown path under /api/docs still reaches the 404 handler.
 */
export const mountSwagger = (app: Express): void => {
  // The page route goes first: the asset middleware treats a bare /api/docs as
  // a directory and would answer 301 /api/docs/ before the page is ever built.
  app.get('/api/docs', swaggerUi.setup(openApiDocument));
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs-json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });
};

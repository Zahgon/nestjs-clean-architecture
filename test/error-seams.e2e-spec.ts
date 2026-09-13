import { faker } from '@faker-js/faker';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { Role } from '@domain/entities/enums/role.enum';
import { bootSeamApp, signToken, withoutTimestamp } from './seam-app';

describe('error envelope and auth seams (e2e)', () => {
  let app: Express;
  let close: () => Promise<void>;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ({ app, close } = await bootSeamApp());
    adminToken = signToken({ sub: 'auth-error-admin', roles: [Role.ADMIN] });
    userToken = signToken({ sub: 'auth-error-user', roles: [Role.USER] });
  }, 60000);

  afterAll(async () => {
    await close();
  });

  describe('error envelope codes', () => {
    it('maps a rejected body to 400 VALIDATION_ERROR carrying the messages as details', async () => {
      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.body.error.details)).toBe(true);
      expect(response.body.error.details).toContain('name should not be empty');
    });

    it('maps a missing token to 401 AUTHENTICATION_ERROR with message Unauthorized', async () => {
      const response = await request(app).get('/api/v1/profile/all');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('maps an insufficient role to 403 AUTHORIZATION_ERROR with message Forbidden resource', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden resource');
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('maps an unknown path to 404 NOT_FOUND', async () => {
      const response = await request(app).get('/api/v1/not-a-route');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('maps a duplicate registration to 409 CONFLICT', async () => {
      const newUser = {
        name: faker.person.firstName(),
        lastname: faker.person.lastName(),
        age: faker.number.int({ min: 18, max: 80 }),
        email: faker.internet.email(),
        password: 'SeamPassword123',
      };

      const first = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(second.status).toBe(409);
      expect(second.body.message).toBe('An account with this email already exists.');
      expect(second.body.error.code).toBe('CONFLICT');
    });

    it('maps an exhausted rate limit to 429 RATE_LIMIT_EXCEEDED and sets Retry-After', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: 'SeamPassword123',
      };

      let response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await request(app)
          .post('/api/v1/auth/login')
          .send(credentials);
      }

      expect(response.status).toBe(429);
      expect(response.body.message).toBe('ThrottlerException: Too Many Requests');
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers['retry-after']).toEqual(expect.any(String));
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    it('maps a plain Error to 500 APPLICATION_ERROR and leaks its message verbatim', async () => {
      const orphanToken = signToken({ sub: 'auth-with-no-profile-at-all' });

      const response = await request(app)
        .put('/api/v1/profile/me')
        .set('Authorization', `Bearer ${orphanToken}`)
        .send({ name: 'Seam Name' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Profile not found for current user');
      expect(response.body.error.code).toBe('APPLICATION_ERROR');
    });
  });

  describe('jwt authentication', () => {
    const rejected: Record<string, unknown>[] = [];

    it('accepts a correctly signed bearer token', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('rejects a request with no Authorization header', async () => {
      const response = await request(app).get('/api/v1/profile/all');

      expect(response.status).toBe(401);
      rejected.push(withoutTimestamp(response.body));
    });

    it('rejects a malformed bearer token', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', 'Bearer not-a-jwt');

      expect(response.status).toBe(401);
      rejected.push(withoutTimestamp(response.body));
    });

    it('rejects a token signed with the wrong secret', async () => {
      const forged = jwt.sign(
        { sub: 'auth-error-admin', email: 'seam@example.com', roles: [Role.ADMIN] },
        'not-the-jwt-secret',
      );

      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${forged}`);

      expect(response.status).toBe(401);
      rejected.push(withoutTimestamp(response.body));
    });

    it('rejects an expired token', async () => {
      const expired = signToken(
        { sub: 'auth-error-admin', roles: [Role.ADMIN] },
        { expiresIn: '-1h' },
      );

      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${expired}`);

      expect(response.status).toBe(401);
      rejected.push(withoutTimestamp(response.body));
    });

    it('answers every rejected token with an identical body', () => {
      expect(rejected).toHaveLength(4);
      expect(rejected[1]).toEqual(rejected[0]);
      expect(rejected[2]).toEqual(rejected[0]);
      expect(rejected[3]).toEqual(rejected[0]);
      expect(rejected[0]).toEqual({
        message: 'Unauthorized',
        error: { code: 'AUTHENTICATION_ERROR', details: null },
        path: '/api/v1/profile/all',
        method: 'GET',
      });
    });
  });

  describe('validation semantics', () => {
    it('reports an unknown property with the whitelist message', async () => {
      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          authId: 'auth-error-admin',
          name: 'Ada',
          lastname: 'Lovelace',
          age: 36,
          nope: 'unexpected',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([
        'property nope should not exist',
      ]);
    });

    it('reports whitelist errors before per-field constraint messages', async () => {
      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nope: 'unexpected' });

      expect(response.status).toBe(400);
      const details: string[] = response.body.error.details;
      const whitelistIndex = details.indexOf('property nope should not exist');
      const constraintIndex = details.findIndex((detail) =>
        detail.startsWith('authId'),
      );

      expect(whitelistIndex).toBe(0);
      expect(constraintIndex).toBeGreaterThan(whitelistIndex);
    });

    it('maps malformed json to 400 VALIDATION_ERROR carrying the parser message', async () => {
      const malformed = '{"name":';
      let parserMessage = 'JSON.parse did not throw';
      try {
        JSON.parse(malformed);
      } catch (error) {
        parserMessage = (error as Error).message;
      }

      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send(malformed);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual([parserMessage]);
    });
  });
});

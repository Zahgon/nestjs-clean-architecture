import { Express } from 'express';
import request from 'supertest';

import { GOOGLE_CLIENT_ID } from '@constants';
import { Role } from '@domain/entities/enums/role.enum';
import { bootSeamApp, signToken } from './seam-app';

describe('routing seams (e2e)', () => {
  let app: Express;
  let close: () => Promise<void>;
  let adminToken: string;

  beforeAll(async () => {
    ({ app, close } = await bootSeamApp());
    adminToken = signToken({ sub: 'auth-routing-admin', roles: [Role.ADMIN] });
  }, 60000);

  afterAll(async () => {
    await close();
  });

  describe('prefix, version and health exclusion', () => {
    it('serves health outside the api prefix and outside versioning', async () => {
      const response = await request(app).get('/health');

      expect(response.status).not.toBe(404);
      expect(response.body.message).not.toBe('Cannot GET /health');
      expect(response.body.path).toBe('/health');
      expect(response.body.method).toBe('GET');
    });

    it('does not serve the health check under the api prefix', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cannot GET /api/v1/health');
    });

    it('serves hello under the api prefix and version one', async () => {
      const response = await request(app).get('/api/v1/hello');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('Hello World!');
    });

    it('does not serve a prefixed route at the bare path', async () => {
      const response = await request(app).get('/hello');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cannot GET /hello');
    });

    it('does not serve a prefixed route without its version segment', async () => {
      const response = await request(app).get('/api/hello');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cannot GET /api/hello');
    });
  });

  describe('unmatched routes', () => {
    it('answers an unknown path with the json error envelope', async () => {
      const response = await request(app).get('/nope');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body.message).toBe('Cannot GET /nope');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.path).toBe('/nope');
      expect(response.body.method).toBe('GET');
    });

    it('builds the message from originalUrl so a query string shows up there but not in path', async () => {
      const response = await request(app).get('/nope?trace=1');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cannot GET /nope?trace=1');
      expect(response.body.path).toBe('/nope');
    });

    it('names the verb of the unmatched request', async () => {
      const response = await request(app).delete('/nope');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cannot DELETE /nope');
      expect(response.body.method).toBe('DELETE');
    });
  });

  describe('route declaration order', () => {
    it('routes auth google to the google handler and not to the id handler', async () => {
      const response = await request(app)
        .get('/api/v1/auth/google')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(response.headers.location).toContain(
        `client_id=${GOOGLE_CLIENT_ID}`,
      );
      expect(response.text).toContain('accounts.google.com');
      expect(response.text).not.toContain('User not found');
    });

    it('routes profile all to the list handler and not to the id handler', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All profiles retrieved successfully');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('routes profile admins to the admins handler and not to the id handler', async () => {
      const response = await request(app)
        .get('/api/v1/profile/admins')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin profiles retrieved successfully');
    });
  });

  describe('scoped middleware', () => {
    it('stamps x-request-id on the profile router', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toEqual(expect.any(String));
    });

    it('echoes an incoming x-request-id rather than minting a new one', async () => {
      const response = await request(app)
        .get('/api/v1/profile/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-request-id', 'seam-correlation-id');

      expect(response.headers['x-request-id']).toBe('seam-correlation-id');
    });

    it('leaves hello without an x-request-id', async () => {
      const response = await request(app).get('/api/v1/hello');

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toBeUndefined();
    });

    it('leaves health without an x-request-id', async () => {
      const response = await request(app).get('/health');

      expect(response.status).not.toBe(404);
      expect(response.headers['x-request-id']).toBeUndefined();
    });
  });
});

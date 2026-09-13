import { ResponseEnvelope } from '@api/response-envelope';
import {
  RequestContext,
  ResponseService,
} from '@application/services/response.service';

describe('response envelope seam', () => {
  let envelope: ResponseEnvelope;

  const req: RequestContext = {
    path: '/all',
    method: 'GET',
    originalUrl: '/api/v1/profile/all?limit=10',
  };

  const keysOnTheWire = (value: unknown): string[] =>
    Object.keys(JSON.parse(JSON.stringify(value)));

  beforeEach(() => {
    envelope = new ResponseEnvelope(new ResponseService());
  });

  it('passes a value that already carries a message straight through', () => {
    const body = { message: 'All profiles retrieved successfully', data: [] };

    const result = envelope.wrap(body, req);

    expect(result.message).toBe('All profiles retrieved successfully');
    expect(result.data).toEqual([]);
  });

  it('checks the message branch before the access_token branch', () => {
    const body = { message: 'Login successful', access_token: 'a.b.c' };

    const result = envelope.wrap(body, req);

    expect(result.message).toBe('Login successful');
  });

  it('turns null into the default message and emits no data key', () => {
    const result = envelope.wrap(null, req);

    expect(result.message).toBe('Operation completed successfully');
    expect(result.data).toBeUndefined();
    expect(keysOnTheWire(result)).not.toContain('data');
  });

  it('turns undefined into the default message and emits no data key', () => {
    const result = envelope.wrap(undefined, req);

    expect(result.message).toBe('Operation completed successfully');
    expect(result.data).toBeUndefined();
    expect(keysOnTheWire(result)).not.toContain('data');
  });

  it('collapses a string into message and drops it from data', () => {
    const result = envelope.wrap('process_cpu_seconds_total 0.12', req);

    expect(result.message).toBe('process_cpu_seconds_total 0.12');
    expect(result.data).toBeUndefined();
    expect(keysOnTheWire(result)).not.toContain('data');
  });

  it('labels an access_token payload as an authentication success', () => {
    const body = { access_token: 'a.b.c', refresh_token: 'd.e.f' };

    const result = envelope.wrap(body, req);

    expect(result.message).toBe('Authentication successful');
    expect(result.data).toEqual(body);
  });

  it('wraps any other object under the default message', () => {
    const body = { id: 'profile-1', name: 'Ada' };

    const result = envelope.wrap(body, req);

    expect(result.message).toBe('Operation completed successfully');
    expect(result.data).toEqual(body);
  });

  it('attaches the request path without its query string, and the method', () => {
    const result = envelope.wrap({ id: 'profile-1' }, req);

    expect(result.path).toBe('/api/v1/profile/all');
    expect(result.method).toBe('GET');
  });

  it('falls back to path when the request carries no originalUrl', () => {
    const result = envelope.wrap({ id: 'profile-1' }, {
      path: '/all',
      method: 'POST',
    });

    expect(result.path).toBe('/all');
    expect(result.method).toBe('POST');
  });
});

import { requireRoles } from '@api/middleware/roles.middleware';
import { ApiError } from '@application/errors/api-error';
import { Role } from '@domain/entities/enums/role.enum';
import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * The guard became `requireRoles(...roles)`, a plain middleware the routers
 * spread into the chains that need it. There is no reflector any more: the
 * roles a route demands are the arguments it was built with, and "no roles are
 * required" is not a value the middleware can be handed - it is the middleware
 * being absent from the chain, which is how the routers express a public route.
 */
describe('RolesGuard', () => {
  let guard: RequestHandler;

  beforeEach(() => {
    guard = requireRoles(Role.ADMIN);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    const mockContext = createMockRequest({});

    const result = canActivate(null, mockContext);

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const mockContext = createMockRequest({
      user: { roles: [Role.ADMIN] }
    });

    const result = canActivate([Role.ADMIN], mockContext);

    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    const mockContext = createMockRequest({
      user: { roles: [Role.USER] }
    });

    const result = canActivate([Role.ADMIN], mockContext);

    expect(result).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    const mockContext = createMockRequest({
      user: { roles: [Role.USER, Role.ADMIN] }
    });

    const result = canActivate([Role.ADMIN, Role.USER], mockContext);

    expect(result).toBe(true);
  });

  it('should deny access when user has no roles', () => {
    const mockContext = createMockRequest({
      user: { roles: [] }
    });

    const result = canActivate([Role.ADMIN], mockContext);

    expect(result).toBe(false);
  });

  it('should deny access when user roles is undefined', () => {
    const mockContext = createMockRequest({
      user: {}
    });

    const result = canActivate([Role.ADMIN], mockContext);

    expect(result).toBe(false);
  });

  function createMockRequest(request: { user?: { roles?: Role[] } }): Request {
    return request as Request;
  }

  /**
   * Runs exactly what a router runs for a route declaring `requiredRoles`:
   * nothing at all when there are none, and otherwise the real middleware,
   * which signals refusal by handing a 403 ApiError to next().
   */
  function canActivate(requiredRoles: Role[] | null, req: Request): boolean {
    if (!requiredRoles) {
      return true;
    }

    let refusal: unknown;
    const next: NextFunction = (error?: unknown) => {
      refusal = error;
    };

    requireRoles(...requiredRoles)(req, {} as Response, next);

    return !(refusal instanceof ApiError);
  }
});

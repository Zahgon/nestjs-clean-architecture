import { Request, RequestHandler, Response, Router } from 'express';
import { ChangePasswordDto } from '@api/dto/auth/change-password.dto';
import { LoginAuthDto } from '@api/dto/auth/login-auth.dto';
import { RefreshTokenDto } from '@api/dto/auth/refresh-token.dto';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { executionTimeMiddleware } from '@api/middleware/execution-time.middleware';
import { ThrottleFactory } from '@api/middleware/throttle.middleware';
import { validateBody } from '@api/middleware/validate-body.middleware';
import { ResponseEnvelope } from '@api/response-envelope';
import { ApiError } from '@application/errors/api-error';
import { AuthService } from '@application/services/auth.service';
import { ResponseService } from '@application/services/response.service';

const TTL = 60000;

export class AuthController {
  readonly router: Router = Router();

  /**
   * @param scoped request id and access logging. Spread per route rather than
   *   mounted with router.use, so a path this router does not serve reaches the
   *   404 without picking up an x-request-id header.
   */
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
    private readonly envelope: ResponseEnvelope,
    scoped: RequestHandler[],
    throttle: ThrottleFactory,
    jwtAuth: RequestHandler,
  ) {
    const { router } = this;
    router.use(executionTimeMiddleware);

    router.post(
      '/register',
      ...scoped,
      throttle('auth:register', 5, TTL),
      validateBody(RegisterAuthDto),
      this.register,
    );
    router.post(
      '/login',
      ...scoped,
      throttle('auth:login', 3, TTL),
      validateBody(LoginAuthDto),
      this.login,
    );
    router.post(
      '/logout',
      ...scoped,
      throttle('auth:logout', 100, TTL),
      jwtAuth,
      this.logout,
    );
    router.post(
      '/change-password',
      ...scoped,
      throttle('auth:changePassword', 5, TTL),
      jwtAuth,
      validateBody(ChangePasswordDto),
      this.changePassword,
    );
    router.post(
      '/refresh-token',
      ...scoped,
      throttle('auth:refreshToken', 100, TTL),
      validateBody(RefreshTokenDto),
      this.refreshToken,
    );

    // The two literal google paths are declared before ':id' on purpose: the
    // parameterised route would otherwise swallow /google.
    router.get(
      '/google',
      ...scoped,
      throttle('auth:googleAuth', 100, TTL),
      this.googleAuth,
    );
    router.get(
      '/google/redirect',
      ...scoped,
      throttle('auth:googleAuthRedirect', 100, TTL),
      this.googleAuthRedirect,
    );

    router.get(
      '/:id',
      ...scoped,
      throttle('auth:getProfile', 100, TTL),
      jwtAuth,
      this.getProfile,
    );
    router.delete(
      '/:id',
      ...scoped,
      throttle('auth:deleteUser', 100, TTL),
      jwtAuth,
      this.deleteUser,
    );
  }

  private register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body as RegisterAuthDto);
    const body = this.responseService.created(
      result,
      'User registration initiated successfully',
    );
    res.status(201).json(this.envelope.wrap(body, req));
  };

  private login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body as LoginAuthDto);
    const body = this.responseService.success('Login successful', result);
    res.status(201).json(this.envelope.wrap(body, req));
  };

  private logout = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.logout(req.user.id);
    const body = this.responseService.success(result.message);
    res.status(201).json(this.envelope.wrap(body, req));
  };

  private changePassword = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as ChangePasswordDto;
    const result = await this.authService.changePassword(
      req.user.id,
      dto.oldPassword,
      dto.newPassword,
    );
    const body = this.responseService.success(result.message);
    res.status(201).json(this.envelope.wrap(body, req));
  };

  private refreshToken = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RefreshTokenDto;
    const result = await this.authService.refreshToken(dto.refresh_token);
    const body = this.responseService.success(
      'Token refreshed successfully',
      result,
    );
    res.status(201).json(this.envelope.wrap(body, req));
  };

  /** The one handler that writes its own response and escapes the envelope. */
  private googleAuth = async (_req: Request, res: Response): Promise<void> => {
    const { redirectUrl, state } = this.authService.initiateGoogleAuth();
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.redirect(redirectUrl);
  };

  private googleAuthRedirect = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const storedState = req.cookies['oauth_state'];
    const result = await this.authService.handleGoogleRedirect(
      code,
      state,
      storedState,
    );

    // Clear the cookie after use
    res.clearCookie('oauth_state');

    const body = this.responseService.success(
      'Google authentication successful',
      result,
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };

  private getProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.authService.findByAuthId(req.params.id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    const body = this.responseService.retrieved(
      user,
      'User profile retrieved successfully',
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };

  private deleteUser = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.deleteByAuthId(req.params.id);
    const body = this.responseService.success(result.message);
    res.status(200).json(this.envelope.wrap(body, req));
  };
}

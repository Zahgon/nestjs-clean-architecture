import { Request, RequestHandler, Response, Router } from 'express';
import { CreateProfileDto } from '@api/dto/create-profile.dto';
import { UpdateProfileDto } from '@api/dto/update-profile.dto';
import { executionTimeMiddleware } from '@api/middleware/execution-time.middleware';
import { requireRoles } from '@api/middleware/roles.middleware';
import { validateBody } from '@api/middleware/validate-body.middleware';
import { ResponseEnvelope } from '@api/response-envelope';
import { ApiError } from '@application/errors/api-error';
import { ProfileService } from '@application/services/profile.service';
import { ResponseService } from '@application/services/response.service';
import { Role } from '@domain/entities/enums/role.enum';

export class ProfileController {
  readonly router: Router = Router();

  constructor(
    private readonly profileService: ProfileService,
    private readonly responseService: ResponseService,
    private readonly envelope: ResponseEnvelope,
    scoped: RequestHandler[],
    jwtAuth: RequestHandler,
  ) {
    const { router } = this;
    router.use(executionTimeMiddleware);

    // 'all' and 'admins' are literal paths and must be declared before ':id',
    // which would otherwise match them and answer from the wrong handler.
    router.get('/all', ...scoped, jwtAuth, requireRoles(Role.ADMIN), this.getAll);
    router.get(
      '/admins',
      ...scoped,
      jwtAuth,
      requireRoles(Role.ADMIN),
      this.getAdmins,
    );
    router.post(
      '/',
      ...scoped,
      jwtAuth,
      validateBody(CreateProfileDto),
      this.create,
    );
    router.get('/:id', ...scoped, jwtAuth, this.getProfile);
    router.put(
      '/me',
      ...scoped,
      jwtAuth,
      validateBody(UpdateProfileDto),
      this.updateMyProfile,
    );
  }

  private getAll = async (req: Request, res: Response): Promise<void> => {
    const profiles = await this.profileService.find();
    const body = this.responseService.retrieved(
      profiles,
      'All profiles retrieved successfully',
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };

  private getAdmins = async (req: Request, res: Response): Promise<void> => {
    const admins = await this.profileService.findByRole(Role.ADMIN);
    const body = this.responseService.retrieved(
      admins,
      'Admin profiles retrieved successfully',
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };

  private create = async (req: Request, res: Response): Promise<void> => {
    const newProfile = await this.profileService.create(
      req.body as CreateProfileDto,
    );
    const body = this.responseService.created(
      newProfile,
      'Profile created successfully',
    );
    res.status(201).json(this.envelope.wrap(body, req));
  };

  private getProfile = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'Profile id is required');
    }

    const profile = await this.profileService.findById(id);
    if (!profile) {
      throw new ApiError(404, 'Profile not found');
    }

    const body = this.responseService.retrieved(
      profile,
      'Profile retrieved successfully',
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };

  private updateMyProfile = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const updatedProfile = await this.profileService.updateMyProfile(
      req.body as UpdateProfileDto,
      req.user.id,
    );
    const body = this.responseService.updated(
      updatedProfile,
      'Profile updated successfully',
    );
    res.status(200).json(this.envelope.wrap(body, req));
  };
}

import { RequestHandler } from 'express';
import * as mongoose from 'mongoose';
import { collectDefaultMetrics } from 'prom-client';

import { AuthController } from '@api/controllers/auth.controller';
import { HelloController } from '@api/controllers/hello.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { createJwtAuth } from '@api/middleware/jwt-auth.middleware';
import {
  createThrottleFactory,
  ThrottleFactory,
  ThrottlerStorage,
} from '@api/middleware/throttle.middleware';
import { ResponseEnvelope } from '@api/response-envelope';
import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { DeleteAuthUserCommand } from '@application/auth/command/delete-auth-user.command';
import { CreateAuthUserHandler } from '@application/auth/command/handler/create-auth-user.handler';
import { DeleteAuthUserHandler } from '@application/auth/command/handler/delete-auth-user.handler';
import { GoogleStrategy } from '@application/auth/google.strategy';
import { RegistrationSaga } from '@application/auth/sagas/registration.saga';
import { CommandBus, ICommand } from '@application/cqrs/command-bus';
import { EventBus } from '@application/cqrs/event-bus';
import { LoggerMiddleware } from '@application/middlewere/logger.middleware';
import { RequestIdMiddleware } from '@application/middlewere/request-id.middleware';
import { CreateProfileCommand } from '@application/profile/command/create-profile.command';
import { CreateProfileHandler } from '@application/profile/command/handler/create-profile.handler';
import { AuthService } from '@application/services/auth.service';
import { LoggerService } from '@application/services/logger.service';
import { ProfileService } from '@application/services/profile.service';
import { ResponseService } from '@application/services/response.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ProfileDomainService } from '@domain/services/profile-domain.service';
import { connectDatabase } from '@infrastructure/database/database.providers';
import { HealthController } from '@infrastructure/health/health.controller';
import { TerminusOptionsService } from '@infrastructure/health/terminus-options.check';
import { MetricsController } from '@infrastructure/metrics/metrics.controller';
import { createModels } from '@infrastructure/models';
import { AuthRepository } from '@infrastructure/repository/auth.repository';
import { ProfileRepository } from '@infrastructure/repository/profile.repository';

/**
 * The one place that knows how the object graph fits together. Everything is
 * constructed here, once, in dependency order; nothing looks its collaborators
 * up at call time.
 */
export class CompositionRoot {
  readonly loggerService: LoggerService;

  readonly responseService: ResponseService;

  readonly responseEnvelope: ResponseEnvelope;

  readonly commandBus: CommandBus;

  readonly eventBus: EventBus;

  readonly authRepository: AuthRepository;

  readonly profileRepository: ProfileRepository;

  readonly googleStrategy: GoogleStrategy;

  readonly authService: AuthService;

  readonly profileService: ProfileService;

  readonly registrationSaga: RegistrationSaga;

  readonly throttlerStorage: ThrottlerStorage;

  readonly throttle: ThrottleFactory;

  readonly jwtAuth: RequestHandler;

  readonly loggerMiddleware: LoggerMiddleware;

  readonly requestIdMiddleware: RequestIdMiddleware;

  readonly authController: AuthController;

  readonly profileController: ProfileController;

  readonly helloController: HelloController;

  readonly healthController: HealthController;

  readonly metricsController: MetricsController;

  private constructor(readonly connection: typeof mongoose) {
    // Persistence
    const { authModel, profileModel } = createModels(connection);
    this.authRepository = new AuthRepository(authModel);
    this.profileRepository = new ProfileRepository(profileModel, authModel);

    // Cross-cutting
    this.loggerService = new LoggerService();
    this.responseService = new ResponseService();
    this.responseEnvelope = new ResponseEnvelope(this.responseService);

    // Domain
    const authDomainService = new AuthDomainService();
    const profileDomainService = new ProfileDomainService();

    // Messaging
    this.commandBus = new CommandBus();
    this.eventBus = new EventBus();

    // Built eagerly and without a guard: a missing GOOGLE_CLIENT_ID kills the
    // process here, at boot, exactly as the strategy it replaced did.
    this.googleStrategy = new GoogleStrategy();

    // Application services
    this.authService = new AuthService(
      this.commandBus,
      this.authRepository,
      this.profileRepository,
      this.loggerService,
      authDomainService,
      profileDomainService,
      this.googleStrategy,
    );
    this.profileService = new ProfileService(
      this.profileRepository,
      this.loggerService,
      profileDomainService,
    );

    // Command handlers
    this.commandBus.register(
      CreateAuthUserCommand,
      new CreateAuthUserHandler(
        this.authRepository,
        this.eventBus,
        this.loggerService,
        authDomainService,
      ),
    );
    this.commandBus.register(
      DeleteAuthUserCommand,
      new DeleteAuthUserHandler(
        this.authRepository,
        this.profileRepository,
        this.eventBus,
        this.loggerService,
        authDomainService,
      ),
    );
    this.commandBus.register(
      CreateProfileCommand,
      new CreateProfileHandler(
        this.profileRepository,
        this.eventBus,
        this.loggerService,
      ),
    );

    // Sagas
    this.registrationSaga = new RegistrationSaga(this.loggerService);
    this.subscribeSagas();

    // HTTP middleware
    this.throttlerStorage = new ThrottlerStorage();
    this.throttle = createThrottleFactory(this.throttlerStorage);
    this.jwtAuth = createJwtAuth();
    this.loggerMiddleware = new LoggerMiddleware(this.loggerService);
    this.requestIdMiddleware = new RequestIdMiddleware();

    // Controllers
    const scoped = [this.loggerMiddleware.use, this.requestIdMiddleware.use];
    this.authController = new AuthController(
      this.authService,
      this.responseService,
      this.responseEnvelope,
      scoped,
      this.throttle,
      this.jwtAuth,
    );
    this.profileController = new ProfileController(
      this.profileService,
      this.responseService,
      this.responseEnvelope,
      scoped,
      this.jwtAuth,
    );
    this.helloController = new HelloController(
      this.loggerService,
      this.responseService,
      this.responseEnvelope,
    );
    this.healthController = new HealthController(
      new TerminusOptionsService(),
      this.responseEnvelope,
    );
    this.metricsController = new MetricsController(this.responseEnvelope);

    collectDefaultMetrics();
  }

  static async create(): Promise<CompositionRoot> {
    const connection = await connectDatabase();
    return new CompositionRoot(connection);
  }

  private subscribeSagas(): void {
    const sagas = [
      this.registrationSaga.userCreated,
      this.registrationSaga.profileCreationFailed,
    ];

    for (const saga of sagas) {
      saga(this.eventBus.stream()).subscribe((command: ICommand) => {
        this.commandBus.execute(command).catch((error: Error) => {
          this.loggerService.err(
            `Saga command ${command.constructor.name} failed: ${error.message}`,
            { module: 'CompositionRoot', method: 'subscribeSagas' },
          );
        });
      });
    }
  }
}

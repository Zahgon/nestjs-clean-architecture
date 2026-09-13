import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';
import { ApiError } from '@application/errors/api-error';
import { EventBus } from '@application/cqrs/event-bus';
import { ICommandHandler } from '@application/cqrs/command-bus';
import { AuthUserCreatedEvent } from '@application/auth/events/auth-user-created.event';
import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { LoggerService } from '@application/services/logger.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';

export class CreateAuthUserHandler
  implements ICommandHandler<CreateAuthUserCommand>
{
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly eventBus: EventBus,
    private readonly logger: LoggerService,
    private readonly authDomainService: AuthDomainService,
  ) {}

  async execute(command: CreateAuthUserCommand): Promise<void> {
    const { registerAuthDto, authId, profileId } = command;
    const { email, password, name, lastname, age } = registerAuthDto;
    const context = { module: 'CreateAuthUserHandler', method: 'execute' };

    this.logger.logger(
      `Starting user registration for email: ${email}`,
      context,
    );

    this.authDomainService.validateUserCreation(registerAuthDto);

    const existingUser = await this.authRepository.findByEmail(email);
    const canCreate = this.authDomainService.canCreateUser(existingUser);
    if (!canCreate) {
      this.logger.warning(
        `Registration failed - email already exists: ${email}`,
        context,
      );
      throw new ApiError(409, 'An account with this email already exists.');
    }

    await this.authRepository.create({
      id: authId,
      email,
      password,
    });

    this.logger.logger(
      `Auth user created successfully with ID: ${authId}. Dispatching event.`,
      context,
    );

    this.eventBus.publish(
      new AuthUserCreatedEvent(authId, profileId, name, lastname, age),
    );
  }
}

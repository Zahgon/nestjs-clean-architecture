import { EventBus } from '@application/cqrs/event-bus';
import { ICommandHandler } from '@application/cqrs/command-bus';
import { CreateProfileCommand } from '@application/profile/command/create-profile.command';
import { IProfileRepository } from '@domain/interfaces/repositories/profile-repository.interface';
import { ProfileCreationFailedEvent } from '@application/profile/events/profile-creation-failed.event';
import { LoggerService } from '@application/services/logger.service';

export class CreateProfileHandler
  implements ICommandHandler<CreateProfileCommand>
{
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly eventBus: EventBus,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: CreateProfileCommand): Promise<void> {
    const { authId, profileId, name, lastname, age } = command;
    const context = { module: 'CreateProfileHandler', method: 'execute' };

    this.logger.logger(
      `Creating profile ${profileId} for auth user ${authId}`,
      context,
    );

    try {
      await this.profileRepository.create({
        id: profileId,
        authId,
        name,
        lastname,
        age,
      });

      this.logger.logger(
        `Profile ${profileId} created successfully for user ${authId}`,
        context,
      );
    } catch (error) {
      this.logger.err(
        `Failed to create profile ${profileId} for user ${authId}: ${error.message}`,
        context,
      );

      this.eventBus.publish(
        new ProfileCreationFailedEvent(authId, profileId, error),
      );
    }
  }
}

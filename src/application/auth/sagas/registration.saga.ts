import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ICommand } from '@application/cqrs/command-bus';
import { ofType } from '@application/cqrs/event-bus';
import { LoggerService } from '@application/services/logger.service';
import { AuthUserCreatedEvent } from '../events/auth-user-created.event';
import { CreateProfileCommand } from '@application/profile/command/create-profile.command';
import { DeleteAuthUserCommand } from '../command/delete-auth-user.command';
import { ProfileCreationFailedEvent } from '@application/profile/events/profile-creation-failed.event';

export class RegistrationSaga {
  constructor(private readonly logger: LoggerService) {}

  userCreated = (events$: Observable<unknown>): Observable<ICommand> => {
    return events$.pipe(
      ofType(AuthUserCreatedEvent),
      map((event) => {
        this.logger.logger(
          `Saga continues: mapping AuthUserCreatedEvent to CreateProfileCommand 
            for user ${event.authId}`,
          { module: 'RegistrationSaga', method: 'userCreated' },
        );
        return new CreateProfileCommand(
          event.profileId,
          event.authId,
          event.name,
          event.lastname,
          event.age,
        );
      }),
    );
  };

  profileCreationFailed = (
    events$: Observable<unknown>,
  ): Observable<ICommand> => {
    return events$.pipe(
      ofType(ProfileCreationFailedEvent),
      map((event) => {
        this.logger.warning(
          `Saga compensates: mapping ProfileCreationFailedEvent to 
            DeleteAuthUserCommand for user ${event.authId}`,
          { module: 'RegistrationSaga', method: 'profileCreationFailed' },
        );
        return new DeleteAuthUserCommand(event.authId, event.profileId);
      }),
    );
  };
}

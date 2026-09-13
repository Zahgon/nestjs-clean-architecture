import { AuthUserCreatedEvent } from '@application/auth/events/auth-user-created.event';
import { DeleteAuthUserCommand } from '@application/auth/command/delete-auth-user.command';
import { RegistrationSaga } from '@application/auth/sagas/registration.saga';
import { CommandBus, ICommand } from '@application/cqrs/command-bus';
import { EventBus } from '@application/cqrs/event-bus';
import { CreateProfileCommand } from '@application/profile/command/create-profile.command';
import { ProfileCreationFailedEvent } from '@application/profile/events/profile-creation-failed.event';
import { LoggerService } from '@application/services/logger.service';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

describe('cqrs dispatch seam', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('command bus', () => {
    it('awaits the handler before execute resolves', async () => {
      const commandBus = new CommandBus();
      let handlerFinished = false;

      commandBus.register(CreateProfileCommand, {
        execute: async () => {
          await flush();
          handlerFinished = true;
        },
      });

      await commandBus.execute(
        new CreateProfileCommand('profile-1', 'auth-1', 'Ada', 'Lovelace', 36),
      );

      expect(handlerFinished).toBe(true);
    });

    it('surfaces a handler rejection to the caller', async () => {
      const commandBus = new CommandBus();

      commandBus.register(CreateProfileCommand, {
        execute: () => Promise.reject(new Error('profile write failed')),
      });

      await expect(
        commandBus.execute(
          new CreateProfileCommand('profile-1', 'auth-1', 'Ada', 'Lovelace', 36),
        ),
      ).rejects.toThrow('profile write failed');
    });

    it('refuses a command with no registered handler', async () => {
      const commandBus = new CommandBus();

      await expect(
        commandBus.execute(new DeleteAuthUserCommand('auth-1', 'profile-1')),
      ).rejects.toThrow('No command handler registered for DeleteAuthUserCommand');
    });

    it('dispatches on the command class, not on the handler registration order', async () => {
      const commandBus = new CommandBus();
      const ran: string[] = [];

      commandBus.register(CreateProfileCommand, {
        execute: async () => {
          ran.push('create');
        },
      });
      commandBus.register(DeleteAuthUserCommand, {
        execute: async () => {
          ran.push('delete');
        },
      });

      await commandBus.execute(new DeleteAuthUserCommand('auth-1', 'profile-1'));

      expect(ran).toEqual(['delete']);
    });
  });

  describe('event bus', () => {
    it('returns from publish without waiting for its subscribers', async () => {
      const eventBus = new EventBus();
      const order: string[] = [];

      eventBus.stream().subscribe(() => {
        void flush().then(() => order.push('subscriber'));
      });

      eventBus.publish(
        new AuthUserCreatedEvent('auth-1', 'profile-1', 'Ada', 'Lovelace', 36),
      );
      order.push('publisher returned');

      expect(order).toEqual(['publisher returned']);

      await flush();
      await flush();

      expect(order).toEqual(['publisher returned', 'subscriber']);
    });
  });

  describe('registration saga', () => {
    let eventBus: EventBus;
    let saga: RegistrationSaga;
    let dispatched: ICommand[];

    beforeEach(() => {
      eventBus = new EventBus();
      saga = new RegistrationSaga(new LoggerService());
      dispatched = [];
    });

    it('maps AuthUserCreatedEvent to CreateProfileCommand', () => {
      saga
        .userCreated(eventBus.stream())
        .subscribe((command) => dispatched.push(command));

      eventBus.publish(
        new AuthUserCreatedEvent('auth-1', 'profile-1', 'Ada', 'Lovelace', 36),
      );

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toBeInstanceOf(CreateProfileCommand);
      expect(dispatched[0]).toEqual(
        new CreateProfileCommand('profile-1', 'auth-1', 'Ada', 'Lovelace', 36),
      );
    });

    it('maps ProfileCreationFailedEvent to DeleteAuthUserCommand', () => {
      saga
        .profileCreationFailed(eventBus.stream())
        .subscribe((command) => dispatched.push(command));

      eventBus.publish(
        new ProfileCreationFailedEvent(
          'auth-1',
          'profile-1',
          new Error('write failed'),
        ),
      );

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toBeInstanceOf(DeleteAuthUserCommand);
      expect(dispatched[0]).toEqual(
        new DeleteAuthUserCommand('auth-1', 'profile-1'),
      );
    });

    it('ignores an event the saga does not select', () => {
      saga
        .userCreated(eventBus.stream())
        .subscribe((command) => dispatched.push(command));

      eventBus.publish(
        new ProfileCreationFailedEvent(
          'auth-1',
          'profile-1',
          new Error('write failed'),
        ),
      );

      expect(dispatched).toEqual([]);
    });
  });
});

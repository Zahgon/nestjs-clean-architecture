export type Constructor<T> = new (...args: any[]) => T;

export type ICommand = object;

export interface ICommandHandler<TCommand> {
  execute(command: TCommand): Promise<void>;
}

/**
 * Dispatches a command to the single handler registered for its class and
 * awaits it. Callers see the handler's rejection, which is what makes the
 * 409 from CreateAuthUserHandler reach the client.
 */
export class CommandBus {
  private readonly handlers = new Map<Constructor<any>, ICommandHandler<any>>();

  register<TCommand>(
    command: Constructor<TCommand>,
    handler: ICommandHandler<TCommand>,
  ): void {
    this.handlers.set(command, handler);
  }

  async execute<TCommand extends ICommand>(command: TCommand): Promise<void> {
    const handler = this.handlers.get(
      command.constructor as Constructor<TCommand>,
    );

    if (!handler) {
      throw new Error(
        `No command handler registered for ${command.constructor.name}`,
      );
    }

    await handler.execute(command);
  }
}

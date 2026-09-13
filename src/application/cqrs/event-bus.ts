import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Constructor } from '@application/cqrs/command-bus';

/**
 * Fire and forget. `publish` pushes onto the subject and returns; whatever a
 * subscriber starts doing in response is not awaited by the publisher. That is
 * what leaves `AuthService.register` racing the profile write.
 */
export class EventBus {
  private readonly events = new Subject<object>();

  publish(event: object): void {
    this.events.next(event);
  }

  stream(): Observable<object> {
    return this.events.asObservable();
  }
}

export const ofType =
  <TEvent>(type: Constructor<TEvent>) =>
  (source: Observable<unknown>): Observable<TEvent> =>
    source.pipe(filter((event): event is TEvent => event instanceof type));

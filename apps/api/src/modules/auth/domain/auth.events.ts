import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';

/**
 * Payload type for the single event owned by the `auth` module
 * (`backend-nest.md`, event table). Plain, JSON-serializable object built
 * from ids -- never the Prisma `User` entity, and never `passwordHash`.
 */
export type UserRegisteredEvent = DomainEvent<
  typeof EventName.USER_REGISTERED,
  UserRegisteredPayload
>;

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Envelope shared by every domain event published through `EventBus`.
 *
 * - `type` is one of the constants in `event-names.ts` (`dominio.accion`, past
 *   tense). Kept generic here so a specific event (e.g. in
 *   `modules/projects/domain/projects.events.ts`) can narrow it with a literal
 *   type instead of the union of all names.
 * - `occurredAt` is a `Date` when the event is constructed in memory (the
 *   common case: `new Date()` at the call site) and a `string` (ISO 8601) once
 *   it has been serialized -- e.g. read back from the `OutboxEvent` table or
 *   received by a listener after a JSON round trip. Both are accepted so
 *   producers and consumers share the same type without an extra mapper.
 * - `payload` is ALWAYS a plain, JSON-serializable object built from ids
 *   (`userId`, `projectId`, ...) and primitives. Never a Prisma entity: Prisma
 *   models carry lazy relations, `Date` objects and driver-specific types that
 *   do not survive the outbox round trip (item 12) or a listener in another
 *   process. Map to a plain object before publishing.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  type: TType;
  occurredAt: Date | string;
  payload: TPayload;
}

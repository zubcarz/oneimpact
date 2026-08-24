import { NotificationType, Role, SubscriptionStatus } from '@oneimpact/shared';
import type {
  AuthResponse,
  AuthTokens,
  CreateSubscriptionInput,
  LoginInput,
  NotificationItem,
  PublishUpdateInput,
  ProjectUpdate,
  RegisterInput,
  SimulatedCard,
  Subscription,
  UserProfile,
} from '@oneimpact/shared';
import {
  SEED_ADMIN_AUTHOR_ID,
  seedProjectUpdatesFixture,
  seedProjectsFixture,
} from './seed-fixtures';

/**
 * In-memory session state for the MSW simulation (`handlers.ts`, action 3,
 * consumes this -- no `msw` import belongs in this file). Pure logic so it is
 * directly unit-testable without spinning up a mock server.
 *
 * Mirrors the real API's rules closely enough that the UI can branch on the
 * same `code`/`status` it would get from `apps/api` (see `SimulatedError`
 * below), but does not replicate implementation details that do not affect
 * an HTTP client: passwords are compared in plain text (never hashed) and
 * tokens are simple deterministic strings, not signed JWTs. Neither leaves
 * this module or a log.
 */

/**
 * Error shape carrying the same `status`/`code`/`message`/`details` the real
 * API's `DomainErrorFilter` produces (`apps/api/src/common/filters/domain-error.filter.ts`),
 * so `handlers.ts` can turn it into a `HttpResponse` body without inventing a
 * new contract. `message` is copy shown to the user; kept in Spanish,
 * matching the API's own messages verbatim where one exists.
 */
export class SimulatedError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SimulatedError';
  }
}

interface SimulatedUserRecord {
  profile: UserProfile;
  /**
   * Plain text, never hashed: this is an in-memory client-side mock, not a
   * credential store, and it never leaves this process. The invariant that
   * actually matters -- the full card PAN never being captured -- is
   * enforced by `SimulatedCard`'s type, not by anything here.
   */
  password: string;
}

interface SimulatedState {
  users: SimulatedUserRecord[];
  nextUserSeq: number;
  subscriptions: Map<string, Subscription>;
  nextSubscriptionSeq: number;
  follows: Map<string, Set<string>>;
  /** Per-user notifications, newest last. `admin-state.ts` only reads counts/lists, never mutates. */
  notifications: Map<string, NotificationItem[]>;
  nextNotificationSeq: number;
  /**
   * Approximates `impact`'s `JourneyPoint` for the dashboard: one point per
   * successful subscription activation for that user. The real API dedupes
   * by `[userId, month, source]`; this simulation does not need that
   * precision because a user can only ever have one subscription at a time
   * here (`SUBSCRIPTION_EXISTS` blocks a second one), so no month can double
   * count.
   */
  journeyPointsByUser: Map<string, number>;
  /** Seeded from `seedProjectUpdatesFixture`, then grown by admin-published updates. */
  projectUpdates: ProjectUpdate[];
  nextUpdateSeq: number;
}

const SEED_ANA_USER_ID = 'user-ana-seed';

function createInitialState(): SimulatedState {
  return {
    users: [
      {
        profile: {
          id: SEED_ADMIN_AUTHOR_ID,
          email: 'admin@oneimpact.org',
          name: 'Admin One Impact',
          role: Role.ADMIN,
        },
        password: 'Admin123!',
      },
      {
        profile: {
          id: SEED_ANA_USER_ID,
          email: 'ana@oneimpact.org',
          name: 'Ana Rodriguez',
          role: Role.USER,
        },
        password: 'User123!',
      },
    ],
    nextUserSeq: 1,
    subscriptions: new Map(),
    nextSubscriptionSeq: 1,
    follows: new Map(),
    notifications: new Map(),
    nextNotificationSeq: 1,
    journeyPointsByUser: new Map(),
    projectUpdates: [...seedProjectUpdatesFixture],
    nextUpdateSeq: 1,
  };
}

let state = createInitialState();

/** Restores the seed users, clears every subscription/follow/notification. For test setup. */
export function resetSimulatedState(): void {
  state = createInitialState();
}

/**
 * Mirrors `NotificationsRepository.upsertNotification`'s idempotency
 * invariant (`@@unique([userId, type, refId])`, `refId` always non-null): a
 * second call with the same `(userId, type, refId)` is a no-op, not a
 * duplicate row.
 */
function addNotification(
  userId: string,
  type: NotificationItem['type'],
  refId: string,
  title: string,
  body: string,
): void {
  const existing = state.notifications.get(userId) ?? [];
  if (existing.some((notification) => notification.type === type && notification.refId === refId)) {
    return;
  }
  existing.push({
    id: `notif-sim-${state.nextNotificationSeq++}`,
    userId,
    type,
    title,
    body,
    refId,
    createdAt: new Date().toISOString(),
  });
  state.notifications.set(userId, existing);
}

// ---------------------------------------------------------------------------
// Users / auth
// ---------------------------------------------------------------------------

function findUserByEmail(email: string): SimulatedUserRecord | undefined {
  return state.users.find((record) => record.profile.email === email);
}

function findUserById(userId: string): SimulatedUserRecord | undefined {
  return state.users.find((record) => record.profile.id === userId);
}

/**
 * Deterministic, opaque-enough token derived from the user id -- not a real
 * JWT. Exported so the simulated `POST /v1/auth/refresh` handler (action 3)
 * can reissue a pair for an already-resolved user id.
 */
export function issueTokens(userId: string): AuthTokens {
  return {
    accessToken: `sim-access.${userId}`,
    refreshToken: `sim-refresh.${userId}`,
  };
}

function userIdFromToken(prefix: 'sim-access' | 'sim-refresh', token: string): string | undefined {
  const [tokenPrefix, userId] = token.split('.');
  return tokenPrefix === prefix && userId ? userId : undefined;
}

export function getUserById(userId: string): UserProfile | undefined {
  return findUserById(userId)?.profile;
}

export function registerUser(input: RegisterInput): AuthResponse {
  if (findUserByEmail(input.email)) {
    throw new SimulatedError(409, 'EMAIL_TAKEN', 'Ese email ya está registrado');
  }

  const profile: UserProfile = {
    id: `user-sim-${state.nextUserSeq++}`,
    email: input.email,
    name: input.name,
    role: Role.USER,
  };
  state.users.push({ profile, password: input.password });

  // Mirrors `NotificationsListener.handleUserRegistered`: refId = userId.
  addNotification(
    profile.id,
    NotificationType.WELCOME,
    profile.id,
    'Bienvenida a One Impact',
    `Hola ${profile.name}, gracias por sumarte a One Impact.`,
  );

  return { user: profile, tokens: issueTokens(profile.id) };
}

/**
 * INVARIANT mirrored from `auth.service.ts#login`: an unknown email and a
 * wrong password both fail with the same `code`/`message` (`INVALID_CREDENTIALS`),
 * so nothing here lets a caller distinguish the two cases.
 */
export function loginUser(input: LoginInput): AuthResponse {
  const record = findUserByEmail(input.email);
  if (!record || record.password !== input.password) {
    throw new SimulatedError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }

  return { user: record.profile, tokens: issueTokens(record.profile.id) };
}

/**
 * Resolves the caller behind an `Authorization: Bearer <token>` header, the
 * simulated equivalent of `JwtAuthGuard` + `JwtStrategy`. Missing header,
 * malformed header or a token that does not resolve to a known user are all
 * indistinguishable 401s, same as the real guard: it never reveals which
 * failed.
 */
export function resolveUserFromAccessToken(
  authorizationHeader: string | null | undefined,
): UserProfile {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : undefined;
  const userId = token ? userIdFromToken('sim-access', token) : undefined;
  const record = userId ? findUserById(userId) : undefined;

  if (!record) {
    throw new SimulatedError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
  return record.profile;
}

/** Used by the simulated `POST /v1/auth/refresh` handler (action 3). */
export function resolveUserIdFromRefreshToken(refreshToken: string): string | undefined {
  const userId = userIdFromToken('sim-refresh', refreshToken);
  return userId && findUserById(userId) ? userId : undefined;
}

/** Mirrors `UsersService.updateProfile`: only `name` is ever writable here. */
export function updateUserName(userId: string, name: string): UserProfile {
  const record = findUserById(userId);
  if (!record) {
    throw new SimulatedError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  }
  record.profile = { ...record.profile, name };
  return record.profile;
}

/** Backs `GET /v1/admin/users`. */
export function listUsers(): UserProfile[] {
  return state.users.map((record) => record.profile);
}

/**
 * Mirrors `UsersService.setRole`, including the "cannot demote the last
 * admin" guard (409 `LAST_ADMIN`) that keeps `/admin/*` reachable.
 */
export function setUserRole(userId: string, role: UserProfile['role']): UserProfile {
  const record = findUserById(userId);
  if (!record) {
    throw new SimulatedError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  }

  const isDemotingLastAdmin = record.profile.role === Role.ADMIN && role !== Role.ADMIN;
  if (isDemotingLastAdmin) {
    const adminCount = state.users.filter((u) => u.profile.role === Role.ADMIN).length;
    if (adminCount <= 1) {
      throw new SimulatedError(409, 'LAST_ADMIN', 'No se puede quitar el ultimo administrador');
    }
  }

  record.profile = { ...record.profile, role };
  return record.profile;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

type PaymentFailureReason = 'CARD_DECLINED' | 'CARD_EXPIRED';

/**
 * Replicates `payments.service.ts#evaluate`/`#isExpired` client-side: a card
 * expiring in its own expiration month is still valid, only the month AFTER
 * it flips to expired. Computed in UTC for the same reason the API does.
 */
function evaluateCard(card: SimulatedCard): PaymentFailureReason | undefined {
  if (card.last4 === '0000') return 'CARD_DECLINED';
  const startOfMonthAfterExpiry = new Date(Date.UTC(card.expYear, card.expMonth, 1));
  if (startOfMonthAfterExpiry <= new Date()) return 'CARD_EXPIRED';
  return undefined;
}

const DECLINE_MESSAGES: Record<PaymentFailureReason, string> = {
  CARD_DECLINED: 'El pago fue rechazado por el emisor de la tarjeta.',
  CARD_EXPIRED: 'La tarjeta ingresada esta vencida.',
};

/**
 * Mirrors `SubscriptionsService.create`: one active subscription per user
 * (409 `SUBSCRIPTION_EXISTS`), simulated payment decline (402
 * `PAYMENT_DECLINED` with `details.reason`), success otherwise.
 */
export function createSubscription(userId: string, input: CreateSubscriptionInput): Subscription {
  if (state.subscriptions.has(userId)) {
    throw new SimulatedError(409, 'SUBSCRIPTION_EXISTS', 'Ya tenes una suscripcion activa.');
  }

  const reason = evaluateCard(input.card);
  if (reason) {
    throw new SimulatedError(402, 'PAYMENT_DECLINED', DECLINE_MESSAGES[reason], { reason });
  }

  const subscription: Subscription = {
    id: `sub-sim-${state.nextSubscriptionSeq++}`,
    userId,
    planId: input.planId,
    billing: input.billing,
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date().toISOString(),
  };
  state.subscriptions.set(userId, subscription);

  // Mirrors `NotificationsListener.handleSubscriptionActivated` and
  // `ImpactListener.handleSubscriptionActivated` (journey point), both fired
  // from the same `subscription.activated` event in the real API.
  addNotification(
    userId,
    NotificationType.SUBSCRIPTION,
    subscription.id,
    'Suscripcion activada',
    'Tu suscripcion se activo correctamente. Gracias por tu apoyo.',
  );
  state.journeyPointsByUser.set(userId, (state.journeyPointsByUser.get(userId) ?? 0) + 1);

  return subscription;
}

/** Mirrors `SubscriptionsService.getMine`: 404 `SUBSCRIPTION_NOT_FOUND` when absent. */
export function getActiveSubscription(userId: string): Subscription {
  const subscription = state.subscriptions.get(userId);
  if (!subscription) {
    throw new SimulatedError(404, 'SUBSCRIPTION_NOT_FOUND', 'No tenes una suscripcion activa.');
  }
  return subscription;
}

/** Mirrors `SubscriptionsService.cancelMine`. */
export function cancelSubscription(userId: string): Subscription {
  const active = getActiveSubscription(userId);
  const canceled: Subscription = {
    ...active,
    status: SubscriptionStatus.CANCELED,
    canceledAt: new Date().toISOString(),
  };
  state.subscriptions.set(userId, canceled);
  return canceled;
}

/** Non-throwing lookup for `admin-state.ts#getDashboardSummary`: no subscription is not an error there. */
export function findSubscription(userId: string): Subscription | undefined {
  return state.subscriptions.get(userId);
}

/** Backs `admin-state.ts#getAdminMetrics`. */
export function listActiveSubscriptions(): Subscription[] {
  return Array.from(state.subscriptions.values()).filter(
    (subscription) => subscription.status === SubscriptionStatus.ACTIVE,
  );
}

/** Journey points recorded for `userId` -- see `journeyPointsByUser`'s doc above. */
export function getJourneyPoints(userId: string): number {
  return state.journeyPointsByUser.get(userId) ?? 0;
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

/** Idempotent, like `FollowsService.follow`: calling it twice is a no-op the second time. */
export function followProject(userId: string, projectId: string): void {
  const followed = state.follows.get(userId) ?? new Set<string>();
  followed.add(projectId);
  state.follows.set(userId, followed);
}

/** Idempotent, like `FollowsService.unfollow`. */
export function unfollowProject(userId: string, projectId: string): void {
  state.follows.get(userId)?.delete(projectId);
}

export function isFollowingProject(userId: string, projectId: string): boolean {
  return state.follows.get(userId)?.has(projectId) ?? false;
}

export function getFollowedProjectIds(userId: string): string[] {
  return Array.from(state.follows.get(userId) ?? []);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** Backs `GET /v1/notifications/me`, newest first. */
export function listNotifications(userId: string): NotificationItem[] {
  return [...(state.notifications.get(userId) ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Mirrors `NotificationsService.markRead`: 404 `NOTIFICATION_NOT_FOUND` both
 * when `id` does not exist and when it belongs to another user -- `userId`
 * scopes the lookup itself, so both cases are indistinguishable here too.
 */
export function markNotificationRead(userId: string, id: string): NotificationItem {
  const notification = state.notifications.get(userId)?.find((item) => item.id === id);
  if (!notification) {
    throw new SimulatedError(404, 'NOTIFICATION_NOT_FOUND', 'La notificacion no existe.');
  }
  notification.readAt = new Date().toISOString();
  return notification;
}

/** Backs `admin-state.ts#getDashboardSummary`'s `unreadNotifications`. */
export function getUnreadNotificationsCount(userId: string): number {
  return (state.notifications.get(userId) ?? []).filter((item) => !item.readAt).length;
}

// ---------------------------------------------------------------------------
// Project updates
// ---------------------------------------------------------------------------

/** Backs `GET /v1/projects/:id`'s `updates` -- seed updates plus any published this session. */
export function listProjectUpdates(projectId: string): ProjectUpdate[] {
  return state.projectUpdates.filter((update) => update.projectId === projectId);
}

/**
 * Mirrors `ProjectsWritesService.publishUpdate` (ADMIN-only, enforced by the
 * handler before this is called): 404 `PROJECT_NOT_FOUND` for an unknown
 * project id, otherwise appends a new update.
 */
export function publishProjectUpdate(
  projectId: string,
  input: PublishUpdateInput,
  authorId: string,
): ProjectUpdate {
  if (!seedProjectsFixture.some((project) => project.id === projectId)) {
    throw new SimulatedError(404, 'PROJECT_NOT_FOUND', `El proyecto "${projectId}" no existe.`);
  }

  const update: ProjectUpdate = {
    id: `update-sim-${state.nextUpdateSeq++}`,
    projectId,
    title: input.title,
    body: input.body,
    progress: input.progress,
    mediaKey: input.mediaUrl,
    publishedAt: new Date().toISOString(),
    authorId,
  };
  state.projectUpdates.push(update);
  return update;
}

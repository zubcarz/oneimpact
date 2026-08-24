import { http, HttpResponse } from 'msw';
import type { HttpResponseResolver } from 'msw';
import { API_PATHS, Role, SEED_PLANS } from '@oneimpact/shared';
import type {
  CreateSubscriptionInput,
  LoginInput,
  ProjectStatus,
  ProjectWithUpdates,
  PublishUpdateInput,
  RegisterInput,
  UpdateProfileInput,
  UpdateUserRoleInput,
  UploadSignInput,
  UserProfile,
  Zone,
} from '@oneimpact/shared';
import { getAdminMetrics, getDashboardSummary } from './admin-state';
import { seedProjectsFixture, seedZonesFixture } from './seed-fixtures';
import {
  SimulatedError,
  cancelSubscription,
  createSubscription,
  followProject,
  getActiveSubscription,
  issueTokens,
  listNotifications,
  listProjectUpdates,
  listUsers,
  loginUser,
  markNotificationRead,
  publishProjectUpdate,
  registerUser,
  resolveUserFromAccessToken,
  resolveUserIdFromRefreshToken,
  setUserRole,
  unfollowProject,
  updateUserName,
} from './state';

/**
 * MSW request handlers serving the full REST contract (`API_PATHS`) over the
 * shared seed dataset, so the demo works without `apps/api` running
 * (`arquitectura-mobile.md:69`). Every response body is built from
 * `@oneimpact/shared` types -- never a hand-shaped object -- so a mismatch
 * between MSW and the real API would show up as a type error here, not just
 * at runtime. `__tests__/msw-handlers.test.ts` additionally validates the
 * actual JSON payloads against the shared zod schemas.
 *
 * URL pattern note: `apps/mobile/src/api/client.ts` builds requests with
 * `baseUrl + path`, and `baseUrl` is `EXPO_PUBLIC_API_URL ?? ''` -- empty
 * when MSW is the active transport (Phase 3's whole point). A leading `*`
 * origin wildcard (`route('/v1/zones')` builds `*` + `/v1/zones`, not just
 * `/v1/zones`) is required so MSW matches both a relative request
 * (`fetch('/v1/zones')`, `baseUrl === ''`)
 * and an absolute one (`fetch('http://host/v1/zones')`, `baseUrl` set) with
 * the same handler.
 */
function route(path: string): string {
  return `*${path}`;
}

// ---------------------------------------------------------------------------
// Error mapping -- the single place that turns a `SimulatedError` into the
// exact body `DomainErrorFilter` produces
// (`apps/api/src/common/filters/domain-error.filter.ts`).
// ---------------------------------------------------------------------------

function errorResponse(error: SimulatedError) {
  return HttpResponse.json(
    {
      statusCode: error.status,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
    { status: error.status },
  );
}

/**
 * Wraps an MSW `HttpResponseResolver`, catching any `SimulatedError` it (or a
 * function it calls, e.g. `resolveUserFromAccessToken`) throws and turning it
 * into the matching HTTP response. Every handler below is wrapped in this
 * instead of repeating the same try/catch nine times. Typed against msw's own
 * `HttpResponseResolver` (not a narrower hand-rolled signature) so `request`/
 * `params` keep flowing through with msw's real types, not `any`.
 */
function guarded(resolver: HttpResponseResolver): HttpResponseResolver {
  return async (info) => {
    try {
      return await resolver(info);
    } catch (error) {
      if (error instanceof SimulatedError) {
        return errorResponse(error);
      }
      throw error;
    }
  };
}

/**
 * `RolesGuard`'s equivalent for handlers gated to ADMIN only
 * (`uploads.sign`, every `admin/*` route). Real Nest guard rejections do not
 * go through `DomainErrorFilter` at all (a different, framework-generated
 * body); this simulation reuses the filter's shape anyway, since the UI only
 * ever branches on `status`, and a consistent envelope is simpler to test
 * against than replicating two distinct error formats.
 */
function requireAdmin(user: UserProfile): void {
  if (user.role !== Role.ADMIN) {
    throw new SimulatedError(403, 'FORBIDDEN', 'No tenes permisos para acceder a este recurso.');
  }
}

function zoneById(zoneId: string): Zone | undefined {
  return seedZonesFixture.find((zone) => zone.id === zoneId);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const authHandlers = [
  http.post(
    route(API_PATHS.auth.register),
    guarded(async ({ request }) => {
      const input = (await request.json()) as RegisterInput;
      const result = registerUser(input);
      return HttpResponse.json(result, { status: 201 });
    }),
  ),

  http.post(
    route(API_PATHS.auth.login),
    guarded(async ({ request }) => {
      const input = (await request.json()) as LoginInput;
      const result = loginUser(input);
      return HttpResponse.json(result, { status: 200 });
    }),
  ),

  http.post(
    route(API_PATHS.auth.refresh),
    guarded(async ({ request }) => {
      const { refreshToken } = (await request.json()) as { refreshToken?: string };
      const userId = refreshToken ? resolveUserIdFromRefreshToken(refreshToken) : undefined;
      if (!userId) {
        throw new SimulatedError(401, 'INVALID_REFRESH_TOKEN', 'Sesion invalida o expirada');
      }
      return HttpResponse.json(issueTokens(userId), { status: 200 });
    }),
  ),

  // Not `@Public()` in the real API: requires a valid access token on top of
  // the refresh token in the body (M2 from the plan's "mismatches" section).
  http.post(
    route(API_PATHS.auth.logout),
    guarded(async ({ request }) => {
      resolveUserFromAccessToken(request.headers.get('authorization'));
      const { refreshToken } = (await request.json().catch(() => ({}))) as {
        refreshToken?: string;
      };
      if (!refreshToken) {
        throw new SimulatedError(400, 'VALIDATION_ERROR', 'refreshToken es requerido');
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

const meHandlers = [
  http.get(
    route(API_PATHS.me),
    guarded(({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      return HttpResponse.json(user, { status: 200 });
    }),
  ),

  http.patch(
    route(API_PATHS.me),
    guarded(async ({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const input = (await request.json()) as UpdateProfileInput;
      const updated = updateUserName(user.id, input.name);
      return HttpResponse.json(updated, { status: 200 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

const plansHandlers = [
  http.get(
    route(API_PATHS.plans),
    guarded(() =>
      HttpResponse.json({ items: SEED_PLANS, total: SEED_PLANS.length }, { status: 200 }),
    ),
  ),
];

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

const zonesHandlers = [
  http.get(
    route(API_PATHS.zones.list),
    guarded(() =>
      HttpResponse.json(
        { items: seedZonesFixture, total: seedZonesFixture.length },
        { status: 200 },
      ),
    ),
  ),

  http.get(
    route(API_PATHS.zones.bySlug(':slug')),
    guarded(({ params }) => {
      const slug = params.slug as string;
      const zone = seedZonesFixture.find((item) => item.slug === slug);
      if (!zone) {
        throw new SimulatedError(404, 'ZONE_NOT_FOUND', `Zone "${slug}" was not found`);
      }
      const projects = seedProjectsFixture.filter((project) => project.zoneId === zone.id);
      return HttpResponse.json({ ...zone, projects }, { status: 200 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const projectsHandlers = [
  http.get(
    route(API_PATHS.projects.list),
    guarded(({ request }) => {
      const url = new URL(request.url);
      const zoneSlug = url.searchParams.get('zoneSlug') ?? undefined;
      const status = (url.searchParams.get('status') as ProjectStatus | null) ?? undefined;
      const zoneId = zoneSlug ? seedZonesFixture.find((z) => z.slug === zoneSlug)?.id : undefined;

      const items = seedProjectsFixture.filter((project) => {
        if (zoneSlug && project.zoneId !== zoneId) return false;
        if (status && project.status !== status) return false;
        return true;
      });
      return HttpResponse.json({ items, total: items.length }, { status: 200 });
    }),
  ),

  http.get(
    route(API_PATHS.projects.byId(':id')),
    guarded(({ params }) => {
      const id = params.id as string;
      const project = seedProjectsFixture.find((item) => item.id === id);
      if (!project) {
        throw new SimulatedError(404, 'PROJECT_NOT_FOUND', `Project "${id}" was not found`);
      }
      const body: ProjectWithUpdates = {
        ...project,
        updates: listProjectUpdates(project.id),
        zone: zoneById(project.zoneId),
      };
      return HttpResponse.json(body, { status: 200 });
    }),
  ),

  // ADMIN-only write, same path prefix as the two public reads above --
  // mirrors `AdminProjectsController` sharing `projects` with `ProjectsController`.
  http.post(
    route(API_PATHS.projects.updates(':id')),
    guarded(async ({ request, params }) => {
      const admin = resolveUserFromAccessToken(request.headers.get('authorization'));
      requireAdmin(admin);
      const id = params.id as string;
      const input = (await request.json()) as PublishUpdateInput;
      const update = publishProjectUpdate(id, input, admin.id);
      return HttpResponse.json(update, { status: 201 });
    }),
  ),

  http.post(
    route(API_PATHS.projects.follow(':id')),
    guarded(({ request, params }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const id = params.id as string;
      assertProjectExists(id);
      followProject(user.id, id);
      return new HttpResponse(null, { status: 200 });
    }),
  ),

  http.delete(
    route(API_PATHS.projects.follow(':id')),
    guarded(({ request, params }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const id = params.id as string;
      assertProjectExists(id);
      unfollowProject(user.id, id);
      return new HttpResponse(null, { status: 200 });
    }),
  ),
];

/**
 * Mirrors `FollowsService.assertProjectExists`: both `follow`/`unfollow`
 * 404 on an unknown project id, even though the follow itself is idempotent.
 */
function assertProjectExists(projectId: string): void {
  if (!seedProjectsFixture.some((project) => project.id === projectId)) {
    throw new SimulatedError(404, 'PROJECT_NOT_FOUND', `El proyecto "${projectId}" no existe.`);
  }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

const subscriptionsHandlers = [
  http.post(
    route(API_PATHS.subscriptions),
    guarded(async ({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const input = (await request.json()) as CreateSubscriptionInput;
      const subscription = createSubscription(user.id, input);
      return HttpResponse.json(subscription, { status: 201 });
    }),
  ),

  http.get(
    route(API_PATHS.subscriptionsMe),
    guarded(({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const subscription = getActiveSubscription(user.id);
      return HttpResponse.json(subscription, { status: 200 });
    }),
  ),

  http.delete(
    route(API_PATHS.subscriptionsMe),
    guarded(({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const canceled = cancelSubscription(user.id);
      return HttpResponse.json(canceled, { status: 200 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const dashboardHandlers = [
  http.get(
    route(API_PATHS.dashboardMe),
    guarded(({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      return HttpResponse.json(getDashboardSummary(user.id), { status: 200 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const notificationsHandlers = [
  http.get(
    route(API_PATHS.notificationsMe),
    guarded(({ request }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const items = listNotifications(user.id);
      return HttpResponse.json({ items, total: items.length }, { status: 200 });
    }),
  ),

  http.patch(
    route(API_PATHS.notificationRead(':id')),
    guarded(({ request, params }) => {
      const user = resolveUserFromAccessToken(request.headers.get('authorization'));
      const id = params.id as string;
      const updated = markNotificationRead(user.id, id);
      return HttpResponse.json(updated, { status: 200 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

const uploadsHandlers = [
  http.post(
    route(API_PATHS.uploads.sign),
    guarded(async ({ request }) => {
      const admin = resolveUserFromAccessToken(request.headers.get('authorization'));
      requireAdmin(admin);
      const input = (await request.json()) as UploadSignInput;
      const key = `uploads/${Date.now()}-${input.filename}`;
      return HttpResponse.json(
        {
          uploadUrl: `https://simulated-storage.oneimpact.org/${key}`,
          key,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          simulated: true,
        },
        { status: 201 },
      );
    }),
  ),
];

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const adminHandlers = [
  http.get(
    route(API_PATHS.admin.metrics),
    guarded(({ request }) => {
      const admin = resolveUserFromAccessToken(request.headers.get('authorization'));
      requireAdmin(admin);
      return HttpResponse.json(getAdminMetrics(), { status: 200 });
    }),
  ),

  http.get(
    route(API_PATHS.admin.users),
    guarded(({ request }) => {
      const admin = resolveUserFromAccessToken(request.headers.get('authorization'));
      requireAdmin(admin);
      const items = listUsers();
      return HttpResponse.json({ items, total: items.length }, { status: 200 });
    }),
  ),

  http.patch(
    route(API_PATHS.admin.userRole(':id')),
    guarded(async ({ request, params }) => {
      const admin = resolveUserFromAccessToken(request.headers.get('authorization'));
      requireAdmin(admin);
      const id = params.id as string;
      const input = (await request.json()) as UpdateUserRoleInput;
      const updated = setUserRole(id, input.role);
      return HttpResponse.json(updated, { status: 200 });
    }),
  ),
];

export const handlers = [
  ...authHandlers,
  ...meHandlers,
  ...plansHandlers,
  ...zonesHandlers,
  ...projectsHandlers,
  ...subscriptionsHandlers,
  ...dashboardHandlers,
  ...notificationsHandlers,
  ...uploadsHandlers,
  ...adminHandlers,
];

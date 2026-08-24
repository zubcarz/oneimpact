import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { OutboxEventSummary, OutboxEventStatus } from '@oneimpact/shared';
import { Role } from '@oneimpact/shared';
import type { OutboxEvent } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OutboxRepository } from '../outbox.repository';
import { OutboxEventDto } from './dto/outbox-event.dto';

const DEFAULT_MAX_ATTEMPTS = 5;
const RECENT_LIMIT = 50;

/**
 * `@Controller('admin/outbox')` -> mounted under the global `v1` prefix set
 * in `main.ts`, so the real path is `/v1/admin/outbox`.
 *
 * `@Roles(Role.ADMIN)` at the class level: same pattern as
 * `AdminUsersController` (`modules/users/controllers/admin-users.controller.ts`).
 * A `USER` gets 403, not 404.
 *
 * Lives in `infra/events` (not `impact`), per decision D3 of
 * `.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`: the
 * outbox is infrastructure for event delivery, not a business domain.
 */
@ApiTags('admin')
@Roles(Role.ADMIN)
@Controller('admin/outbox')
export class OutboxAdminController {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Plain array response, NOT the `{ items, total }` list envelope other
   * list endpoints use (e.g. `AdminUsersController.list`): the plan
   * (`.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`,
   * Fase 3) specifies `OutboxEventSummary[]` explicitly for this diagnostic
   * endpoint -- a fixed "last 50" snapshot, not a paginated resource.
   */
  @Get()
  @ApiOkResponse({ type: OutboxEventDto, isArray: true })
  async list(): Promise<OutboxEventSummary[]> {
    const maxAttempts = this.config.get<number>('OUTBOX_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS);
    const rows = await this.outbox.listRecent(RECENT_LIMIT);
    return rows.map((row) => this.toSummary(row, maxAttempts));
  }

  /**
   * Status is DERIVED, never stored (decision D1): `PROCESSED` if
   * `processedAt` is set, `FAILED` if unprocessed and out of attempts,
   * `PENDING` otherwise -- mirrors the `WHERE` clause
   * `OutboxRepository.findPendingBatch` uses to decide what the relay still
   * retries.
   */
  private toSummary(row: OutboxEvent, maxAttempts: number): OutboxEventSummary {
    return {
      id: row.id,
      type: row.type,
      status: this.deriveStatus(row, maxAttempts),
      attempts: row.attempts,
      lastError: row.lastError ?? undefined,
      createdAt: row.createdAt.toISOString(),
      processedAt: row.processedAt?.toISOString(),
    };
  }

  private deriveStatus(row: OutboxEvent, maxAttempts: number): OutboxEventStatus {
    if (row.processedAt) {
      return 'PROCESSED';
    }
    return row.attempts >= maxAttempts ? 'FAILED' : 'PENDING';
  }
}

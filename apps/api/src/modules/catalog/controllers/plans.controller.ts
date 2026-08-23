import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { CatalogService } from '../application/catalog.service';
import { PlanListDto } from './dto/plan.dto';

/**
 * `@Controller('plans')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real path is `/v1/plans`.
 * Do NOT prefix the decorator with `/v1`: `API_PATHS` (packages/shared)
 * already includes it and is meant for clients/e2e assertions, not for this
 * decorator.
 *
 * `@Public()`: plan pricing is public marketing content, readable before
 * registering or logging in.
 */
@ApiTags('catalog')
@Public()
@Controller('plans')
export class PlansController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: PlanListDto })
  list(): Promise<PlanListDto> {
    return this.catalog.listPlans();
  }
}

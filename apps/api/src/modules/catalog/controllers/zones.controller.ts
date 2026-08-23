import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { CatalogService } from '../application/catalog.service';
import { ZoneListDto } from './dto/zone.dto';
import { ZoneDetailDto } from './dto/zone-detail.dto';

/**
 * `@Controller('zones')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/zones` and `/v1/zones/:slug`. Do NOT prefix the decorators with
 * `/v1`: `API_PATHS` (packages/shared) already includes it and is meant for
 * clients/e2e assertions, not for these decorators.
 *
 * `@Public()`: zones are public marketing content, browsable before
 * registering or logging in.
 */
@ApiTags('catalog')
@Public()
@Controller('zones')
export class ZonesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: ZoneListDto })
  list(): Promise<ZoneListDto> {
    return this.catalog.listZones();
  }

  @Get(':slug')
  @ApiOkResponse({ type: ZoneDetailDto })
  getBySlug(@Param('slug') slug: string): Promise<ZoneDetailDto> {
    return this.catalog.getZoneBySlug(slug);
  }
}

import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * `@Public()`: uptime/monitoring probes and `pnpm dev:api` sanity checks hit
 * this with no session. It also sits outside the `v1` prefix (`main.ts`,
 * `setGlobalPrefix('v1', { exclude: ['health', 'docs'] })`), but that only
 * affects the path, not the guard -- without `@Public()` it would still 401.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: 'ok',
      service: 'oneimpact-api',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}

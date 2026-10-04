import { Controller, Get } from '@nestjs/common';

/** Excluded from the /api/v1 global prefix (see main.ts) — health checks
 * are infra-facing, not part of the versioned public API. */
@Controller('health')
export class AppController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

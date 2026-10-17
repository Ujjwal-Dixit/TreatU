import { Controller, Sse, UseGuards, type MessageEvent } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUserOrNull } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { RealtimeService } from './realtime.service';

@Controller('events')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * GET /events — Server-Sent Events. Works logged out (public offer
   * changes); with a Bearer token it also carries the caller's own claim
   * changes, or, for an owner, claims at their restaurant. The token is
   * checked once at connect: an open stream outlives the 15-minute access
   * token, and clients reconnect with a fresh one after a refresh.
   */
  @Sse()
  @UseGuards(OptionalJwtAuthGuard)
  // One long-lived request per client — reconnects after a network blip
  // shouldn't eat into the app-wide request budget.
  @SkipThrottle()
  stream(
    @CurrentUserOrNull() user?: JwtAccessPayload,
  ): Promise<Observable<MessageEvent>> {
    return this.realtime.streamFor(user);
  }
}

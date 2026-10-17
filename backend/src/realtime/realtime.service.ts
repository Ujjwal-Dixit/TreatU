import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, interval, map, merge, Subject, type Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

/**
 * "Something changed — refetch it" signals, not data. Clients already have
 * REST endpoints for every resource, so events only say *what* to refresh;
 * that keeps the stream tiny, keeps authorization in one place (the REST
 * endpoints), and means a missed event costs at most one stale screen
 * until the next refetch, never inconsistent data.
 */
export type RealtimeEvent =
  /** An offer's details or today's seat count changed. Public. */
  | { type: 'offers.changed'; restaurantId: string }
  /** A claim was made/cancelled/redeemed/expired. Sent only to the
   * customer who owns it and the owner of that restaurant. */
  | {
      type: 'claim.changed';
      claimId: string;
      restaurantId: string;
      userId: string;
    };

/** Proxies and mobile networks drop idle connections; a comment line every
 * 25s keeps the stream open. SSE comments are ignored by clients. */
const HEARTBEAT_MS = 25_000;

/**
 * In-process pub/sub. Correct for the current single backend instance;
 * with more than one instance, an event published on instance A would never
 * reach clients connected to B — swap the Subject for Redis pub/sub (or
 * Postgres LISTEN/NOTIFY) at that point. Nothing outside this file changes.
 */
@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<RealtimeEvent>();

  constructor(private readonly prisma: PrismaService) {}

  publish(event: RealtimeEvent): void {
    this.events$.next(event);
  }

  /** The per-connection stream: public events for everyone, plus private
   * ones for the signed-in customer / restaurant owner. */
  async streamFor(user?: JwtAccessPayload): Promise<Observable<MessageEvent>> {
    const ownedRestaurantId =
      user?.role === 'restaurant_owner'
        ? (
            await this.prisma.restaurant.findFirst({
              where: { ownerUserId: user.sub },
              select: { id: true },
            })
          )?.id
        : undefined;

    const isVisible = (event: RealtimeEvent): boolean => {
      if (event.type === 'offers.changed') return true;
      return (
        event.userId === user?.sub || event.restaurantId === ownedRestaurantId
      );
    };

    const events = this.events$.pipe(
      filter(isVisible),
      map((event): MessageEvent => {
        // userId is only used for routing — never broadcast it.
        const { type, ...payload } = event;
        const data =
          'userId' in payload
            ? { claimId: payload.claimId, restaurantId: payload.restaurantId }
            : payload;
        return { type, data };
      }),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ comment: 'ping' })),
    );
    return merge(events, heartbeat);
  }
}

import { useMemo } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useEventStream } from './use-event-stream';
import type { StreamEvent } from './event-stream';

/** A burst of events (e.g. a claim publishes both claim.changed and
 * offers.changed) collapses into one refetch per query within this window. */
const COALESCE_MS = 300;

function createCoalescedInvalidator(invalidate: (key: QueryKey) => void) {
  const pending = new Map<string, QueryKey>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (keys: QueryKey[]) => {
    for (const key of keys) pending.set(JSON.stringify(key), key);
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending.forEach(invalidate);
      pending.clear();
    }, COALESCE_MS);
  };
}

/**
 * Turns backend change signals into React Query invalidations, so any
 * screen showing that data refetches in place: a restaurant posting or
 * editing an offer appears on Home/Explore/detail without pull-to-refresh,
 * and a Dining Pass flips to "Redeemed" the moment staff redeem it.
 * Renders nothing — mounted once in the root layout.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient();

  const invalidate = useMemo(
    () => createCoalescedInvalidator((queryKey) => void queryClient.invalidateQueries({ queryKey })),
    [queryClient],
  );

  useEventStream(
    (event: StreamEvent) => {
      const data = (event.data ?? {}) as { restaurantId?: string; claimId?: string };
      if (event.type === 'offers.changed' && data.restaurantId) {
        invalidate([['home-feed'], ['restaurants'], ['favorites'], ['restaurant', data.restaurantId]]);
      } else if (event.type === 'claim.changed' && data.claimId) {
        invalidate([['claims'], ['claim', data.claimId], ['me']]);
      }
    },
    () => void queryClient.invalidateQueries(),
  );

  return null;
}

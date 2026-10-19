import { useMemo } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useEventStream } from './use-event-stream';
import type { StreamEvent } from './event-stream';
import type { OwnerDashboardDto, RestaurantDto } from '@/api/types';

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
 * Live dashboard: a customer claiming (or cancelling) one of this
 * restaurant's offers updates "Customers Today", the claimed counts and the
 * bookings list without a pull-to-refresh. Mounted once in the root layout.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient();

  const invalidate = useMemo(
    () => createCoalescedInvalidator((queryKey) => void queryClient.invalidateQueries({ queryKey })),
    [queryClient],
  );

  useEventStream(
    (event: StreamEvent) => {
      const data = (event.data ?? {}) as { restaurantId?: string };
      if (event.type === 'claim.changed') {
        // Only ever delivered for our own restaurant (filtered server-side).
        invalidate([['dashboard'], ['claims'], ['offers'], ['offer']]);
      } else if (event.type === 'offers.changed') {
        // Public event for every restaurant in the city — only ours matters
        // (e.g. an edit made from a second staff phone). Also sent when the
        // restaurant's own details or hours change.
        const ownId =
          queryClient.getQueryData<OwnerDashboardDto>(['dashboard'])?.restaurant.id ??
          queryClient.getQueryData<RestaurantDto>(['restaurant'])?.id;
        if (!ownId || data.restaurantId === ownId) {
          invalidate([['dashboard'], ['offers'], ['offer'], ['restaurant']]);
        }
      }
    },
    () => void queryClient.invalidateQueries(),
  );

  return null;
}

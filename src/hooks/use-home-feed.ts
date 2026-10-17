import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getHomeFeed } from '@/api/endpoints/restaurants';
import { useDistanceOrigin } from '@/location/distance-origin';

export function useHomeFeed() {
  const origin = useDistanceOrigin();
  return useQuery({
    // Origin is part of the key so distances refresh once location arrives;
    // keepPreviousData avoids flashing a spinner while they do.
    queryKey: ['home-feed', origin],
    queryFn: () => getHomeFeed(origin),
    placeholderData: keepPreviousData,
  });
}

import { useQuery } from '@tanstack/react-query';
import { getHomeFeed } from '@/api/endpoints/restaurants';

export function useHomeFeed() {
  return useQuery({ queryKey: ['home-feed'], queryFn: getHomeFeed });
}

import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx — those are correctness errors (not found,
        // validation, auth), not transient network blips worth retrying.
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});

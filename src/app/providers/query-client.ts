import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/api-error';

/** A refused request (4xx) answers the same on retry; only network and server failures are retried. */
export function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createApplicationQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
      },
    },
  });
}

import { QueryClient } from '@tanstack/react-query';

export function createApplicationQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
}

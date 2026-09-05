import { DThemeProvider, DToastProvider } from '@digvation-labs/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { createApplicationQueryClient } from './query-client';

export function ApplicationProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createApplicationQueryClient);

  return (
    <DThemeProvider mode="light" radius="default">
      <DToastProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </DToastProvider>
    </DThemeProvider>
  );
}

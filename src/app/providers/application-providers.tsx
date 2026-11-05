import { DLocalizationProvider, DThemeProvider, DToastProvider, enMessages } from '@digvation/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { AuthProvider } from '../../features/auth/auth-provider';
import { createApplicationQueryClient } from './query-client';

export function ApplicationProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createApplicationQueryClient);

  return (
    <DThemeProvider mode="dark" radius="default">
      <DLocalizationProvider locale="en-US" messages={enMessages}>
        <DToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </DToastProvider>
      </DLocalizationProvider>
    </DThemeProvider>
  );
}

import { DLocalizationProvider, DThemeProvider, DToastProvider } from '@digvation/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { AuthProvider } from '../../features/auth/auth-provider';
import { useDisplayLocale } from '../../shared/format/locale';
import { THEME_TOKENS, useResolvedMode } from '../../shared/theme/appearance';
import { createApplicationQueryClient } from './query-client';

export function ApplicationProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createApplicationQueryClient);
  const mode = useResolvedMode();
  const locale = useDisplayLocale();

  return (
    <DThemeProvider mode={mode} radius="default" tokens={THEME_TOKENS[mode]}>
      <DLocalizationProvider locale={locale}>
        <DToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </DToastProvider>
      </DLocalizationProvider>
    </DThemeProvider>
  );
}

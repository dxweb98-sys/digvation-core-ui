import { DLocalizationProvider, DToastProvider, enMessages } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthUser } from '../features/auth/auth-context';

export const TEST_USER: AuthUser = {
  id: 'user-1',
  fullname: 'Ops One',
  phone_number: null,
  email: 'ops@digvation.id',
  username: 'ops',
  is_active: true,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/** Renders a signed-in screen; CORE is answered by the test's fetch stub. */
export function renderApp(ui: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DLocalizationProvider locale="en-US" messages={enMessages}>
        <DToastProvider>
          <AuthContext.Provider
            value={{
              status: 'authenticated',
              user: TEST_USER,
              login: async () => undefined,
              logout: async () => undefined,
              setUser: () => undefined,
            }}
          >
            <MemoryRouter initialEntries={[route]}>
              <Routes>
                <Route path={path} element={ui} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </DToastProvider>
      </DLocalizationProvider>
    </QueryClientProvider>,
  );
}

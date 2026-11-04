import { DToastProvider } from '@digvation/ui';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationProviders } from '../providers/application-providers';
import { ApplicationShell } from './application-shell';

vi.mock('../../features/auth/use-auth', () => ({
  useAuth: () => ({
    user: { fullname: 'Control Operator', email: 'operator@example.test' },
    logout: vi.fn(),
  }),
}));

function renderShell(path: string) {
  render(
    <DToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ApplicationShell />}>
            <Route path="*" element={<h1>Routed page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </DToastProvider>,
  );
}

describe('ApplicationShell', () => {
  it('marks the active route by more than color and keeps every existing route', () => {
    renderShell('/clients');
    const navigation = within(screen.getByRole('navigation', { name: 'Primary navigation' }));

    const active = navigation.getByRole('link', { name: 'Clients' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveClass('navigation-item-active');
    expect(navigation.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/clients',
      '/products',
      '/capabilities',
      '/installations',
      '/infrastructure',
      '/deployments',
      '/incidents',
      '/users',
      '/invitations',
      '/roles',
      '/audit',
      '/platform-health',
    ]);
  });

  it('gives every navigation item a drawn icon hidden from assistive technology', () => {
    renderShell('/');
    const links = within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('link');

    for (const link of links) {
      const icon = link.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon?.querySelector('path')?.getAttribute('d')).toBeTruthy();
    }
  });

  it('wraps routed content in the page enter transition', () => {
    renderShell('/clients');

    expect(screen.getByRole('heading', { name: 'Routed page' }).parentElement).toHaveClass('page-enter');
  });
});

describe('ApplicationProviders', () => {
  it('runs the application in dark mode through the public theme provider', () => {
    render(<ApplicationProviders><span>content</span></ApplicationProviders>);

    expect(document.documentElement).toHaveAttribute('data-ds-mode', 'dark');
  });
});

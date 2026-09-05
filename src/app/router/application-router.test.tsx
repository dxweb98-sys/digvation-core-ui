import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createApplicationQueryClient } from '../providers/query-client';
import { applicationRoutes } from './application-routes';

function renderRoute(path: string) {
  const router = createMemoryRouter(applicationRoutes, {
    initialEntries: [path],
  });

  return render(
    <QueryClientProvider client={createApplicationQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('application routing foundation', () => {
  it('renders the overview through the application shell', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Local mock data')).toBeInTheDocument();
  });

  it('renders a recoverable not-found state for unknown routes', async () => {
    renderRoute('/unknown-control-center-view');

    expect(
      await screen.findByText('Page not found'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Return to overview' }),
    ).toBeInTheDocument();
  });
});

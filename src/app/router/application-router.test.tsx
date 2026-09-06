import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('renders operational dashboard sections through the application shell', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Requires attention' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Client application health' }),
    ).toBeInTheDocument();
    expect(screen.getByText('POS API restart loop')).toBeInTheDocument();
    expect(screen.getByText('stark')).toBeInTheDocument();
  });

  it('keeps grouped navigation functional for reserved routes', async () => {
    renderRoute('/clients');

    expect(
      await screen.findByRole('heading', { name: 'Clients' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Clients' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );

    const menuButton = screen.getByRole('button', { name: 'Menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
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

import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveClientDataSource } from '../data/resolve-client-data-source';
import { ClientListPage } from './client-list-page';

const clientDataSource = resolveClientDataSource();

const CLIENT = {
  id: 'client-1',
  code: 'NOVA',
  displayName: 'Nova Salon',
  status: 'ACTIVE',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <DToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </DToastProvider>
    </QueryClientProvider>
  );
}

function serveClients() {
  vi.spyOn(clientDataSource, 'getClients').mockResolvedValue({
    clients: [CLIENT],
    total: 1,
    totalPages: 1,
  } as never);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ClientListPage visual states', () => {
  it('shows a labelled skeleton while clients load', () => {
    vi.spyOn(clientDataSource, 'getClients').mockReturnValue(new Promise(() => undefined));
    render(withProviders(<ClientListPage />));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading clients');
    expect(status.querySelectorAll('.content-skeleton-block').length).toBeGreaterThan(0);
  });

  it('reveals rows once and removes the reveal so later table updates do not animate', async () => {
    serveClients();
    render(withProviders(<ClientListPage />));

    const heading = await screen.findByRole('heading', { name: 'Clients' });
    const page = heading.closest('.clients-page');
    expect(page).toHaveClass('list-reveal');

    await waitFor(() => expect(page).not.toHaveClass('list-reveal'), { timeout: 1500 });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('keeps the page title and primary action', async () => {
    serveClients();
    render(withProviders(<ClientListPage />));

    expect(await screen.findByRole('heading', { name: 'Clients' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add client' })).toBeInTheDocument();
  });
});

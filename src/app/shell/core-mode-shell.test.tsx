import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreDashboard } from '../../features/dashboard/components/core-dashboard';
import { CoreApiStatus } from './core-api-status';

vi.mock('../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('core API status', () => {
  it('reports reachable from a real health response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<CoreApiStatus />));

    expect(await screen.findByText('Reachable')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe('http://core.test/health/live');
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('reports unreachable when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(wrap(<CoreApiStatus />));

    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });

  it('reports unreachable on a server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));

    render(wrap(<CoreApiStatus />));

    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });
});

describe('core dashboard', () => {
  it('shows real totals from CORE and marks every other section not connected', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        json({
          success: true,
          data: { items: [], pagination: { total: String(input).includes('/clients') ? 7 : 3 } },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<CoreDashboard />));

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('Not connected yet')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Requires attention' })).toBeInTheDocument();
    const paths = fetchMock.mock.calls.map(([input]) => String(input));
    expect(paths.every((path) => path.includes('/clients?') || path.includes('/installations?'))).toBe(true);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardContent from '../components/dashboard-content';
import { createMockDashboardDataSource } from '../data/mock-dashboard-data-source';
import { DashboardPage } from './dashboard-page';

// The charts live in a lazy chunk, and the first import under test can be slow.
const LAZY_CHUNK = { timeout: 15000 };

const dashboardMocks = vi.hoisted(() => ({ getOverview: vi.fn() }));

vi.mock('../data/resolve-dashboard-data-source', () => ({
  resolveDashboardDataSource: () => ({ getOverview: dashboardMocks.getOverview }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

async function serve(state: 'populated' | 'no-trends') {
  dashboardMocks.getOverview.mockResolvedValue(await createMockDashboardDataSource(state).getOverview());
}

beforeEach(() => dashboardMocks.getOverview.mockReset());

describe('dashboard charts', () => {
  it('shows every snapshot chart with an accessible name', async () => {
    await serve('populated');
    renderPage();

    for (const name of ['Installation health', 'Recent deployment outcomes', 'Node resource utilization']) {
      expect(await screen.findByRole('figure', { name }, LAZY_CHUNK)).toBeInTheDocument();
    }
  });

  it('derives the health chart from the existing snapshot fields', async () => {
    await serve('populated');
    renderPage();

    const figure = await screen.findByRole('figure', { name: 'Installation health' }, LAZY_CHUNK);
    const table = within(figure).getByRole('table', { hidden: true });
    const healthyRow = within(table).getByText('Healthy').closest('tr');
    expect(healthyRow).toHaveTextContent('2');
  });

  it('keeps exact utilization values in the table alternative', async () => {
    await serve('populated');
    renderPage();

    const figure = await screen.findByRole('figure', { name: 'Node resource utilization' }, LAZY_CHUNK);
    const table = within(figure).getByRole('table', { hidden: true });
    expect(within(table).getByText('91%')).toBeInTheDocument();
  });

  it('keeps the KPI numbers and adds sparklines when trends exist', async () => {
    await serve('populated');
    renderPage();

    expect(await screen.findByText('Managed installations', {}, LAZY_CHUNK)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Open incidents over 7 days: from \d+ to 2/ })).toBeInTheDocument();
  });

  it('switches the trend range', async () => {
    await serve('populated');
    renderPage();

    const short = await screen.findByRole('button', { name: '24h' }, LAZY_CHUNK);
    const long = screen.getByRole('button', { name: '7d' });
    expect(short).toHaveAttribute('aria-pressed', 'true');
    const rowsBefore = within(screen.getByRole('figure', { name: 'stark utilization' })).getAllByRole('row', { hidden: true }).length;

    fireEvent.click(long);

    expect(long).toHaveAttribute('aria-pressed', 'true');
    const rowsAfter = within(screen.getByRole('figure', { name: 'stark utilization' })).getAllByRole('row', { hidden: true }).length;
    expect(rowsAfter).not.toBe(rowsBefore);
  });

  it('switches the hero between nodes', async () => {
    await serve('populated');
    renderPage();

    await screen.findByRole('figure', { name: 'stark utilization' }, LAZY_CHUNK);
    const group = screen.getByRole('group', { name: 'Trend node' });
    fireEvent.click(within(group).getByRole('button', { name: 'atlas' }));

    expect(screen.getByRole('figure', { name: 'atlas utilization' })).toBeInTheDocument();
    expect(screen.queryByRole('figure', { name: 'stark utilization' })).not.toBeInTheDocument();
  });

  it('keeps requires attention first and gives it the status glow', async () => {
    await serve('populated');
    renderPage();

    const panel = await screen.findByRole('region', { name: 'Requires attention' }, LAZY_CHUNK);
    expect(panel).toHaveClass('glow-card-danger');
    expect(panel.closest('.dashboard-bento')?.querySelector('.glow-card')).toBe(panel);
  });

  it('keeps neutral cards on the single accent', async () => {
    await serve('populated');
    renderPage();

    const clients = (await screen.findByText('Clients', {}, LAZY_CHUNK)).closest('.glow-card');
    expect(clients).toHaveClass('glow-card-accent');
    expect(screen.getByRole('figure', { name: 'Installation health' }).closest('.glow-card')).toHaveClass('glow-card-accent');
  });

  it('shows per-node and healthy-share rings with status in words', async () => {
    await serve('populated');
    renderPage();

    expect(await screen.findByRole('img', { name: 'Memory: 91%, Critical pressure' }, LAZY_CHUNK)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /40% of 5 managed installations are healthy/ })).toBeInTheDocument();
  });

  it('never claims live data in mock mode', async () => {
    await serve('populated');
    renderPage();

    await screen.findByRole('figure', { name: 'stark utilization' }, LAZY_CHUNK);
    expect(screen.queryByText(/\blive\b/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  it('schedules no recurring work and no random values', async () => {
    const dashboard = await createMockDashboardDataSource('populated').getOverview();
    // Rendered directly: waitFor helpers use setInterval, and so does jsdom's frame polyfill.
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const interval = vi.spyOn(window, 'setInterval');
    const random = vi.spyOn(Math, 'random');

    render(<DashboardContent dashboard={dashboard} />);
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    expect(interval).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    interval.mockRestore();
    random.mockRestore();
    vi.unstubAllGlobals();
  });

  it('shows the final numbers without animation under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await serve('populated');
    renderPage();

    const label = await screen.findByText('Managed installations', {}, LAZY_CHUNK);
    expect(label.closest('.kpi-card')?.querySelector('.kpi-card-value [aria-hidden="true"]')).toHaveTextContent('5');
    vi.unstubAllGlobals();
  });

  it('shows an empty state without trends and never fabricates a series', async () => {
    await serve('no-trends');
    renderPage();

    expect(await screen.findByText('No trend history yet', {}, LAZY_CHUNK)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '24h' })).not.toBeInTheDocument();
    expect(screen.queryByRole('figure', { name: 'stark utilization' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /over 7 days/ })).not.toBeInTheDocument();
    // Snapshot charts need no history.
    expect(screen.getByRole('figure', { name: 'Installation health' })).toBeInTheDocument();
  });
});

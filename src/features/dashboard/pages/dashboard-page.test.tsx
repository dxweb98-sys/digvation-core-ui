import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';

const dashboardMocks = vi.hoisted(() => ({
  getOverview: vi.fn(),
}));

vi.mock('../data/resolve-dashboard-data-source', () => ({
  resolveDashboardDataSource: () => ({
    getOverview: dashboardMocks.getOverview,
  }),
}));

describe('dashboard error state', () => {
  beforeEach(() => {
    dashboardMocks.getOverview.mockReset();
    dashboardMocks.getOverview.mockRejectedValue(
      new Error('Controlled dashboard test failure.'),
    );
  });

  it('renders a recoverable error and retries the dashboard request', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Operational dashboard unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controlled dashboard test failure.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));

    await waitFor(() => {
      expect(dashboardMocks.getOverview).toHaveBeenCalledTimes(2);
    });
  });
});

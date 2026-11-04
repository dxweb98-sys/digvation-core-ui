import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientCommercialTab } from './client-commercial-tab';

vi.mock('../data/resolve-subscription-data-source', () => ({
  resolveSubscriptionDataSource: () => ({
    getClientCommercialSummary: async () => [
      {
        clientProductId: 'client-product-1',
        productId: 'product-1',
        productName: 'Digvation POS',
        productCode: 'POS',
        terms: [],
        addOns: [],
        configurations: [],
      },
    ],
  }),
}));

vi.mock('../../client-products/hooks/use-client-products', () => ({
  useClientProducts: () => ({
    isPending: false,
    isError: false,
    data: [
      {
        id: 'client-product-1',
        productId: 'product-1',
        productName: 'Digvation POS',
        productCode: 'POS',
      },
    ],
  }),
}));

describe('ClientCommercialTab', () => {
  it('renders the commercial records of a client', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DToastProvider>
          <ClientCommercialTab clientId="client-1" />
        </DToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Digvation POS')).toBeInTheDocument();
  });
});

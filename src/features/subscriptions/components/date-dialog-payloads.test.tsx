import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientProductCommercialSummary } from '../types/subscription';
import { SubscriptionAddOnDialog } from './subscription-add-on-dialog';
import { InitialSubscriptionDialog, RenewalDialog } from './subscription-term-dialogs';

const source = vi.hoisted(() => ({
  createInitialSubscription: vi.fn(),
  addRenewalTerm: vi.fn(),
  addSubscriptionAddOn: vi.fn(),
  getClientCommercialSummary: vi.fn(),
}));
const catalog = vi.hoisted(() => ({
  getProductPrices: vi.fn(),
  getProductAddOns: vi.fn(),
}));

vi.mock('../data/resolve-subscription-data-source', () => ({
  resolveSubscriptionDataSource: () => source,
}));
vi.mock('../../commercial-catalog/data/resolve-commercial-catalog-data-source', () => ({
  resolveCommercialCatalogDataSource: () => catalog,
}));

const PRICE = {
  id: 'price-1',
  billingCycle: 'MONTHLY',
  currency: 'IDR',
  amountMinor: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const originalZone = process.env.TZ;

function summaryWithTermEnding(endsAt: string) {
  return {
    clientProductId: 'cp-1',
    productId: 'product-1',
    productName: 'Digvation POS',
    productCode: 'POS',
    addOns: [],
    subscription: { id: 'subscription-1', status: 'ACTIVE' },
    currentTerm: {
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt,
      billingCycle: 'MONTHLY',
      currency: 'IDR',
      agreedAmountMinor: 100,
    },
    latestTerm: {
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt,
      billingCycle: 'MONTHLY',
      currency: 'IDR',
      agreedAmountMinor: 100,
    },
  } as unknown as ClientProductCommercialSummary;
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <DToastProvider>{node}</DToastProvider>
    </QueryClientProvider>
  );
}

async function field(name: RegExp) {
  return screen.findByRole('textbox', { name });
}

function setZone(zone: string) {
  process.env.TZ = zone;
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
}

async function submitWhenPriced(formId: string, listPrice: RegExp) {
  await screen.findAllByText(listPrice);
  fireEvent.submit(document.getElementById(formId) as HTMLFormElement);
}

beforeEach(() => {
  for (const mock of [...Object.values(source), ...Object.values(catalog)]) mock.mockReset();
  catalog.getProductPrices.mockResolvedValue([PRICE]);
  catalog.getProductAddOns.mockResolvedValue([
    { id: 'offering-1', code: 'SEATS', name: 'Seats', status: 'ACTIVE', prices: [PRICE] },
  ]);
  source.createInitialSubscription.mockResolvedValue({});
  source.addRenewalTerm.mockResolvedValue({});
  source.addSubscriptionAddOn.mockResolvedValue({});
});
afterEach(() => {
  process.env.TZ = originalZone;
});

describe.each([
  ['Asia/Jakarta', '2026-11-30T17:00:00.000Z', '2026-12-31T17:00:00.000Z'],
  ['UTC', '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
])('date dialogs in %s', (zone, dec1Instant, jan1Instant) => {
  beforeEach(() => setZone(zone));

  it('initial subscription sends local-midnight instants for start and end', async () => {
    render(wrap(<InitialSubscriptionDialog summary={summaryWithTermEnding('2026-11-30T17:00:00.000Z')} clientId="client-1" onClose={vi.fn()} />));

    fireEvent.change(await field(/^Starts/), { target: { value: '2026-12-01' } });
    fireEvent.change(await field(/^Ends/), { target: { value: '2027-01-01' } });
    await submitWhenPriced('initial-subscription-form', /Rp/);

    await waitFor(() => expect(source.createInitialSubscription).toHaveBeenCalledTimes(1));
    expect(source.createInitialSubscription.mock.calls[0][0]).toMatchObject({
      startsAt: dec1Instant,
      endsAt: jan1Instant,
    });
  });

  it('renewal left unchanged sends the exact previous end', async () => {
    const end = '2026-11-30T17:00:00.000Z';
    render(wrap(<RenewalDialog summary={summaryWithTermEnding(end)} onClose={vi.fn()} />));

    await submitWhenPriced('renewal-form', /Rp/);

    await waitFor(() => expect(source.addRenewalTerm).toHaveBeenCalledTimes(1));
    expect(source.addRenewalTerm.mock.calls[0][1].startsAt).toBe(end);
    expect(source.addRenewalTerm.mock.calls[0][1].endsAt).toBeUndefined();
  });

  it('renewal with an edited start sends the local-midnight instant', async () => {
    render(wrap(<RenewalDialog summary={summaryWithTermEnding('2026-10-31T00:00:00.000Z')} onClose={vi.fn()} />));

    fireEvent.change(await field(/^Starts/), { target: { value: '2026-12-01' } });
    await submitWhenPriced('renewal-form', /Rp/);

    await waitFor(() => expect(source.addRenewalTerm).toHaveBeenCalledTimes(1));
    expect(source.addRenewalTerm.mock.calls[0][1].startsAt).toBe(dec1Instant);
  });

  it('add-on effective date sends the local-midnight instant', async () => {
    render(wrap(<SubscriptionAddOnDialog summary={summaryWithTermEnding('2027-11-30T17:00:00.000Z')} onClose={vi.fn()} />));

    fireEvent.click(await screen.findByRole('button', { name: /^Add-on offering/ }));
    fireEvent.click((await screen.findAllByRole('option'))[0]);
    fireEvent.change(await field(/^Effective from/), { target: { value: '2026-12-01' } });
    await submitWhenPriced('subscription-add-on-form', /Rp/);

    await waitFor(() => expect(source.addSubscriptionAddOn).toHaveBeenCalledTimes(1));
    expect(source.addSubscriptionAddOn.mock.calls[0][0].effectiveFrom).toBe(dec1Instant);
  });
});

describe('date dialog display and errors', () => {
  it('prefills the renewal start with the local date of the previous end', async () => {
    setZone('Asia/Jakarta');
    render(wrap(<RenewalDialog summary={summaryWithTermEnding('2026-11-30T17:00:00.000Z')} onClose={vi.fn()} />));

    expect(await field(/^Starts/)).toHaveValue('2026-12-01');
  });

  it('refuses a value that is not a calendar date and sends nothing', async () => {
    setZone('UTC');
    render(wrap(<RenewalDialog summary={summaryWithTermEnding('2026-11-30T17:00:00.000Z')} onClose={vi.fn()} />));

    fireEvent.change(await field(/^Starts/), { target: { value: '2026-11-30T17:00:00.000Z' } });
    await submitWhenPriced('renewal-form', /Rp/);

    expect(await screen.findByText('Use the format YYYY-MM-DD.')).toBeInTheDocument();
    expect(source.addRenewalTerm).not.toHaveBeenCalled();
  });

  it('shows a CORE rejection inside the renewal form', async () => {
    setZone('Asia/Jakarta');
    source.addRenewalTerm.mockRejectedValue(new Error('Renewal term cannot overlap the previous subscription term'));
    render(wrap(<RenewalDialog summary={summaryWithTermEnding('2026-11-30T17:00:00.000Z')} onClose={vi.fn()} />));

    fireEvent.change(await field(/^Starts/), { target: { value: '2026-11-30' } });
    await submitWhenPriced('renewal-form', /Rp/);

    const dialog = await screen.findByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Renewal term cannot overlap the previous subscription term');
    expect(alert.closest('form')).toHaveAttribute('id', 'renewal-form');
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { BrandDetailPage } from './brand-detail-page';

const entity = {
  id: 'le-1',
  client_id: 'client-1',
  name: 'PT Kreasi Barbershop',
  legal_name: 'PT Kreasi Barbershop Nusantara',
  tax_identifier: '02.345.678.9-012.000',
  email: 'finance@barbershop.example',
  phone: null,
  address: null,
  country: 'ID',
  timezone: 'Asia/Jakarta',
  notes: null,
  status: 'ACTIVE',
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const brand = {
  id: 'brand-1',
  client_id: 'client-1',
  group_id: 'group-1',
  legal_entity_id: 'le-1',
  code: 'NOVA_BARBER',
  name: 'Nova Barber',
  description: 'Barbershop di Jakarta Selatan',
  logo_url: null,
  website: null,
  primary_color: null,
  secondary_color: null,
  status: 'ACTIVE',
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  billing_contacts: [{ id: 'c-1', name: 'Bima', email: 'billing@nova.example', phone: null, position: null }],
  billing_contact_source: 'BRAND',
  pic_contacts: [{ id: 'c-2', name: 'Teddy', email: 'it@nova.example', phone: null, position: null }],
  pic_source: 'GROUP',
  group: { id: 'group-1', name: 'Barbershops' },
  bill_to: { source: 'BRAND', legal_entity: entity },
  services: [
    {
      id: 'service-1',
      product: { id: 'p-1', code: 'POS_SALON', name: 'POS Salon' },
      status: 'TRIAL',
      contract: { id: 'contract-1', status: 'TRIAL' },
    },
  ],
  add_ons: [
    {
      client_add_on_id: 'ca-1',
      add_on_id: 'ao-1',
      code: 'LOYALTY',
      name: 'Loyalty pack',
      status: 'ACTIVE',
      service_id: 'service-1',
      product: { id: 'p-1', code: 'POS_SALON', name: 'POS Salon' },
      contract_add_on: {
        id: 'cao-1',
        currency: 'IDR',
        agreed_amount: '35000000',
        effective_from: '2026-12-01',
        effective_until: null,
      },
    },
  ],
  installations: [
    {
      id: 'inst-1',
      code: 'NOVA-ONPREM-01',
      name: 'Nova on-premise',
      deployment_mode: 'DEDICATED',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
    },
  ],
};

const client = {
  id: 'client-1',
  code: 'NOVA',
  display_name: 'Nova',
  legal_name: 'PT Nova Kreasi Indonesia',
  status: 'ACTIVE',
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  groups: [
    {
      id: 'group-1',
      client_id: 'client-1',
      name: 'Barbershops',
      notes: null,
      default_legal_entity_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      brands: [],
    },
    {
      id: 'group-2',
      client_id: 'client-1',
      name: 'Salons',
      notes: null,
      default_legal_entity_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      brands: [],
    },
  ],
  brands: [],
  legal_entities: [entity],
  contacts: [],
  summary: {
    groups: 2,
    brands: 1,
    legal_entities: 1,
    contacts: 0,
    services_open: 1,
    contracts_active: 1,
    installations: 1,
  },
  credit: [],
};

function serve(permissions: string[]) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: [], permissions });
    if (path === '/clients/client-1' && call.method === 'GET') return envelope(client);
    if (path === '/clients/client-1/brands/brand-1' && call.method === 'GET') return envelope(brand);
    return envelope({});
  });
}

function renderBrand() {
  renderApp(<BrandDetailPage />, {
    path: 'clients/:clientId/brands/:brandId',
    route: '/clients/client-1/brands/brand-1',
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('brand detail', () => {
  it('shows who the brand bills and what runs under it', async () => {
    serve(['clients.read']);
    renderBrand();

    expect(await screen.findByRole('heading', { name: 'Nova Barber' })).toBeInTheDocument();
    expect(screen.getByText('Legal entity brand ini')).toBeInTheDocument();
    expect(screen.getByText('PT Kreasi Barbershop Nusantara')).toBeInTheDocument();
    expect(screen.getByText('02.345.678.9-012.000')).toBeInTheDocument();
    expect(screen.getByText('billing@nova.example')).toBeInTheDocument();
    expect(screen.getByText('Group: Barbershops')).toBeInTheDocument();

    // DDataTable renders rows twice (table plus mobile cards), so each list is scoped.
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(3);
    expect(within(tables[0]).getByText('POS Salon')).toBeInTheDocument();
    expect(within(tables[1]).getByText('Loyalty pack')).toBeInTheDocument();
    expect(within(tables[1]).getByText('Rp 350.000')).toBeInTheDocument();
    expect(within(tables[2]).getByText('NOVA-ONPREM-01')).toBeInTheDocument();
  });

  it('moves the brand to another group of the same client', async () => {
    const { calls } = serve(['clients.read', 'clients.manage']);
    renderBrand();

    fireEvent.click(await screen.findByRole('button', { name: 'Pindahkan ke group' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(selectTrigger(dialog));
    fireEvent.click(await screen.findByRole('option', { name: 'Salons' }));
    expect(screen.queryByRole('option', { name: 'Barbershops' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pindahkan' }));

    await waitFor(() => {
      const call = calls.find((item) => item.method === 'PUT');
      expect(call?.body).toEqual({ group_id: 'group-2' });
    });
  });
});

/** The design system renders a select as a button that opens a listbox. */
function selectTrigger(dialog: HTMLElement) {
  const trigger = within(dialog)
    .getAllByRole('button')
    .find((node) => node.getAttribute('aria-haspopup') === 'listbox');
  if (!trigger) throw new Error('the dialog has no select trigger');
  return trigger;
}

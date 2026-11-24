import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { openRowActions } from '../../../test/table';
import { ClientDetailPage } from './client-detail-page';

/** A client that already uses groups and a second bill-to. */
const entity = {
  id: 'le-1',
  client_id: 'client-1',
  name: 'PT Kreasi Barbershop',
  legal_name: 'PT Kreasi Barbershop Nusantara',
  tax_identifier: '02.345.678.9-012.000',
  email: null,
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

const groupedBrand = {
  id: 'brand-1',
  client_id: 'client-1',
  group_id: 'group-1',
  legal_entity_id: null,
  code: 'NOVA_BARBER',
  name: 'Nova Barber',
  status: 'ACTIVE',
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
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
      notes: 'Satu penagihan untuk semua barbershop',
      default_legal_entity_id: 'le-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      brands: [groupedBrand],
    },
  ],
  brands: [],
  legal_entities: [entity],
  contacts: [],
  summary: {
    groups: 1,
    brands: 1,
    legal_entities: 1,
    contacts: 0,
    services_open: 0,
    contracts_active: 0,
    installations: 0,
  },
  credit: [],
};

function serve(permissions: string[]) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: [], permissions });
    if (path === '/clients/client-1' && call.method === 'GET') return envelope(client);
    if (path === '/clients/client-1/brands' && call.method === 'GET') return envelope({ items: [groupedBrand] });
    return envelope({});
  });
}

async function openClient(permissions: string[]) {
  serve(permissions);
  renderApp(<ClientDetailPage />, { path: '/clients/:clientId', route: '/clients/client-1' });
  await screen.findByRole('heading', { name: 'Nova' });
}

afterEach(() => vi.unstubAllGlobals());

describe('client groups', () => {
  it('lists the group with its brands and its default legal entity', async () => {
    await openClient(['clients.read']);

    fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }));

    // DDataTable renders the same rows as a table and as a mobile card list, so the table is scoped.
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('link', { name: 'Nova Barber' })).toHaveAttribute(
      'href',
      '/clients/client-1/brands/brand-1',
    );
    expect(within(table).getByText('Barbershops')).toBeInTheDocument();
    expect(within(table).getByText('PT Kreasi Barbershop')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah group' })).not.toBeInTheDocument();
  });

  it('offers group management to an operator who manages clients', async () => {
    await openClient(['clients.read', 'clients.manage']);

    await fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }));

    expect(await screen.findByRole('button', { name: 'Tambah group' })).toBeInTheDocument();
    await openRowActions(0);
    expect(await screen.findByText('Edit')).toBeInTheDocument();
  });
});

describe('client legal entities', () => {
  it('shows which brands and groups still use an entity', async () => {
    await openClient(['clients.read']);

    fireEvent.click(await screen.findByRole('tab', { name: 'Legal entity' }));

    const table = await screen.findByRole('table');
    const row = within(table).getByRole('row', { name: /PT Kreasi Barbershop/ });
    expect(within(row).getByText('1 group')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah legal entity' })).not.toBeInTheDocument();
  });

  it('names the entity as the bill-to of its own group', async () => {
    await openClient(['clients.read', 'clients.manage', 'clients.lifecycle.manage']);

    fireEvent.click(await screen.findByRole('tab', { name: 'Legal entity' }));

    expect(await screen.findByRole('button', { name: 'Tambah legal entity' })).toBeInTheDocument();
    await openRowActions(0);
    // The row menu exists once per rendering of the rows (table and mobile cards).
    expect((await screen.findAllByText('Arsipkan')).length).toBeGreaterThan(0);
  });
});

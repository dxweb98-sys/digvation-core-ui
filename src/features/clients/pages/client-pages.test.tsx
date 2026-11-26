import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes, useLocation } from 'react-router';
import { ApplicationShell } from '../../../app/shell/application-shell';
import { setDisplayLocale } from '../../../shared/format/locale';
import { brandDetail, client, detail, novaDetail } from '../../../test/clients-fixtures';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { chooseFilter } from '../../../test/table';
import type { Client, ClientDetail } from '../clients-api';
import { BrandPage } from './brand-page';
import { BusinessPage } from './business-page';
import { ClientDetailPage } from './client-detail-page';
import { ClientListPage } from './client-list-page';

const CLIENTS: Client[] = [
  client(),
  client({ id: 'cln-2', code: 'DCLN-261124-0002', full_name: 'Nova Beauty Salon', email: 'owner@nova-salon.invalid', phone: '6281200000002' }),
  client({ id: 'cln-3', code: 'DCLN-261102-0001', full_name: 'Toko Lama Jaya', status: 'ARCHIVED' }),
];

interface Serve {
  permissions?: string[];
  items?: Client[];
  details?: Record<string, ClientDetail>;
}

function serve({ permissions = ['*'], items = CLIENTS, details = {} }: Serve = {}) {
  return mockFetch((call) => {
    const url = new URL(call.url);
    const path = url.pathname;
    if (path === '/authorization/me')
      return envelope({ roles: permissions.includes('*') ? ['SUPER_ADMIN'] : ['MEMBER'], permissions });
    if (path === '/roles') return envelope({ items: [] });
    if (path === '/invitations') return envelope({ items: [], pagination: { page: 1, limit: 1, total: 0, total_pages: 1 } });
    if (path === '/clients') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const shown = items.filter(
        (item) => (!status || item.status === status) && (!search || `${item.code} ${item.full_name}`.toLowerCase().includes(search.toLowerCase())),
      );
      return envelope({ items: shown, pagination: { page: 1, limit: 20, total: shown.length, total_pages: 1 } });
    }
    const brand = /^\/clients\/([^/]+)\/brands\/([^/]+)$/.exec(path);
    if (brand) {
      const owner = details[brand[1]];
      const found = owner?.businesses.some((item) => item.brands.some((entry) => entry.id === brand[2]));
      return found ? envelope(brandDetail(owner, brand[2])) : failure(404, 'BRAND_NOT_FOUND');
    }
    const one = /^\/clients\/([^/]+)$/.exec(path);
    if (one) return details[one[1]] ? envelope(details[one[1]]) : failure(404, 'CLIENT_NOT_FOUND');
    return failure(404, 'NOT_FOUND');
  });
}

const listCalls = (calls: RecordedCall[]) => calls.filter((call) => new URL(call.url).pathname === '/clients');

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}</output>;
}

/** The client pages under the real shell, so the header breadcrumb is the one operators see. */
function renderPages(route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/" element={<ApplicationShell />}>
          <Route path="clients" element={<ClientListPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="clients/:clientId/businesses/:businessId" element={<BusinessPage />} />
          <Route path="clients/:clientId/brands/:brandId" element={<BrandPage />} />
        </Route>
      </Routes>
      <Where />
    </>,
    { path: '/*', route },
  );
}

const main = () => within(screen.getByRole('main'));
const breadcrumb = () => within(document.querySelector<HTMLElement>('.header-breadcrumb')!);

beforeEach(() => setDisplayLocale('id-ID'));
afterEach(() => vi.unstubAllGlobals());

describe('clients list', () => {
  it('sends search and status to CORE, names the filter in the toolbar, and dims archived rows', async () => {
    const { calls } = serve();
    renderPages('/clients');
    const table = within(await screen.findByRole('table'));
    expect(await table.findByText('Poseidon Filter')).toBeInTheDocument();
    expect(table.getAllByText('owner@poseidon-filter.invalid')[0]).toBeInTheDocument();
    expect(table.getAllByText('0812 0000 0001')[0]).toBeInTheDocument();
    expect(screen.getByText('3 klien')).toBeInTheDocument();
    expect(table.getByText('Toko Lama Jaya').closest('tr')?.querySelector('.clients-dim')).not.toBeNull();
    expect(table.getByText('Poseidon Filter').closest('tr')?.querySelector('.clients-dim')).toBeNull();

    await chooseFilter('Status', 'Diarsipkan');
    await waitFor(() => expect(listCalls(calls).some((call) => call.url.includes('status=ARCHIVED'))).toBe(true));
    expect(await screen.findByText('1 klien · Status: Diarsipkan')).toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText('Cari kode atau nama')[0], { target: { value: 'toko' } });
    await waitFor(() => expect(listCalls(calls).some((call) => call.url.includes('search=toko'))).toBe(true), { timeout: 2000 });
  });

  it('opens the detail from a row click and from the row link', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients');
    const table = within(await screen.findByRole('table'));
    const link = await table.findByRole('link', { name: 'Poseidon Filter' });
    expect(link).toHaveAttribute('href', '/clients/cln-1');
    fireEvent.click(table.getAllByText('owner@poseidon-filter.invalid')[0]);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/clients/cln-1'));
  });

  it('shows "Belum ada klien" without a table, and the register button only with clients.manage', async () => {
    serve({ items: [], permissions: ['clients.read'] });
    renderPages('/clients');
    expect(await screen.findByText('Belum ada klien')).toBeInTheDocument();
    expect(screen.getByText('Klien yang didaftarkan muncul di sini.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daftarkan klien' })).not.toBeInTheDocument();
  });

  it('shows no-match with "Hapus filter"', async () => {
    serve();
    renderPages('/clients');
    await (within(await screen.findByRole('table'))).findByText('Poseidon Filter');
    await chooseFilter('Status', 'Ditangguhkan');
    expect((await screen.findAllByText('Tidak ada klien yang cocok'))[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hapus filter' })[0]);
    expect(await within(screen.getByRole('table')).findByText('Poseidon Filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daftarkan klien' })).toBeInTheDocument();
  });
});

describe('client detail', () => {
  it('shows the header, the business list with billing sources and the client card', async () => {
    serve({ details: { 'cln-2': novaDetail() } });
    renderPages('/clients/cln-2');
    expect(await main().findByRole('heading', { name: 'Nova Beauty Salon' })).toBeInTheDocument();
    expect(main().getByText('DCLN-261124-0002')).toBeInTheDocument();
    expect(main().getByText(/^Status sejak 24 Nov 2026 \d\d:\d\d/)).toBeInTheDocument();
    expect(breadcrumb().getByRole('link', { name: 'Klien' })).toHaveAttribute('href', '/clients');
    expect(breadcrumb().getByText('Nova Beauty Salon')).toBeInTheDocument();

    const table = within(main().getByRole('table'));
    expect(table.getByRole('link', { name: 'NOVA' })).toHaveAttribute('href', '/clients/cln-2/businesses/biz-nova');
    expect(table.getAllByText('alias bisnis')).toHaveLength(1);
    expect(table.getByText('CV Nova Barber Indonesia')).toBeInTheDocument();
    expect(table.getByText('dari badan hukum')).toBeInTheDocument();
    expect(main().getByText('0812 0000 0002')).toBeInTheDocument();
    expect(main().getByRole('button', { name: 'Ubah status' })).toBeInTheDocument();
    expect(main().getByRole('button', { name: 'Ubah data' })).toBeInTheDocument();
    expect(main().queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['DRAFT', 'Klien masih draf'],
    ['SUSPENDED', 'Klien ditangguhkan'],
    ['ARCHIVED', 'Klien diarsipkan'],
  ] as const)('shows the %s banner', async (status, title) => {
    serve({ details: { 'cln-1': detail({ status }) } });
    renderPages('/clients/cln-1');
    expect(await main().findByText(title)).toBeInTheDocument();
    if (status === 'ARCHIVED') expect(main().queryByRole('button', { name: 'Ubah data' })).not.toBeInTheDocument();
    else expect(main().getByRole('button', { name: 'Ubah data' })).toBeInTheDocument();
  });

  it('offers the actions by permission', async () => {
    serve({ details: { 'cln-1': detail() }, permissions: ['clients.read'] });
    renderPages('/clients/cln-1');
    expect(await main().findByRole('heading', { name: 'Poseidon Filter' })).toBeInTheDocument();
    expect(main().queryByRole('button', { name: 'Ubah status' })).not.toBeInTheDocument();
    expect(main().queryByRole('button', { name: 'Ubah data' })).not.toBeInTheDocument();
  });

  it('opens a business from its row', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients/cln-1');
    fireEvent.click(await within(await main().findByRole('table')).findByText('PT Poseidon Filter Indonesia'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/clients/cln-1/businesses/biz-1'));
  });

  it('says when the client does not exist', async () => {
    serve();
    renderPages('/clients/missing');
    expect(await screen.findByText('Klien tidak ditemukan')).toBeInTheDocument();
  });
});

describe('business page', () => {
  it('reads the business from the client detail, with alias and client fallbacks (NOVA)', async () => {
    const { calls } = serve({ details: { 'cln-2': novaDetail() } });
    renderPages('/clients/cln-2/businesses/biz-nova');
    expect(await main().findByRole('heading', { name: 'NOVA' })).toBeInTheDocument();
    expect(breadcrumb().getByRole('link', { name: 'Nova Beauty Salon' })).toHaveAttribute('href', '/clients/cln-2');
    expect(breadcrumb().getByText('NOVA')).toBeInTheDocument();
    expect(main().getAllByRole('link', { name: 'Nova Beauty Salon' }).map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/clients/cln-2', '/clients/cln-2/brands/brd-nova']),
    );

    const billing = within(main().getByRole('region', { name: 'Penagihan' }));
    expect(billing.getByText('alias bisnis')).toBeInTheDocument();
    expect(billing.getByText('dari data klien')).toBeInTheDocument();
    expect(billing.getByText('kontak penagihan bisnis')).toBeInTheDocument();
    expect(billing.getByText('admin@nova-salon.invalid · 0812 0000 0003')).toBeInTheDocument();
    expect(billing.getByText('dari kontak')).toBeInTheDocument();

    expect(main().getByText('Belum ada badan hukum. Tagihan memakai alias bisnis.')).toBeInTheDocument();
    expect(main().getByText('Memakai alamat klien')).toBeInTheDocument();
    expect(main().getByText('Memakai email klien')).toBeInTheDocument();
    expect(main().getByText('Memakai telepon klien')).toBeInTheDocument();
    const contacts = within(main().getByRole('region', { name: 'Kontak' }));
    for (const flag of ['Utama', 'Penagihan', 'PIC']) expect(contacts.getByText(flag)).toBeInTheDocument();
    // No extra request: only the client detail.
    expect(calls.filter((call) => /\/clients\/cln-2\//.test(new URL(call.url).pathname))).toHaveLength(0);
  });

  it('shows the legal entity and business sources, and the brand-only contact (NOVABARBER)', async () => {
    serve({ details: { 'cln-2': novaDetail() } });
    renderPages('/clients/cln-2/businesses/biz-barber');
    expect(await main().findByRole('heading', { name: 'NOVABARBER' })).toBeInTheDocument();
    const billing = within(main().getByRole('region', { name: 'Penagihan' }));
    expect(billing.getByText('dari badan hukum')).toBeInTheDocument();
    expect(billing.getByText('dari bisnis')).toBeInTheDocument();
    expect(billing.getByText('dari data klien')).toBeInTheDocument();
    expect(main().getByText('Khusus brand Nova Barber')).toBeInTheDocument();
    expect(main().getByText('02.345.678.9-013.000')).toBeInTheDocument();
    expect(main().getByRole('link', { name: 'Nova Barber' })).toHaveAttribute('href', '/clients/cln-2/brands/brd-barber');
  });

  it('shows the legal entity address as the billing address source (POSEIDON)', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients/cln-1/businesses/biz-1');
    const billing = within(await main().findByRole('region', { name: 'Penagihan' }));
    expect(billing.getAllByText('dari badan hukum')).toHaveLength(2);
    expect(main().getByText('Belum ada kontak. Email dan telepon klien yang dipakai.')).toBeInTheDocument();
  });

  it('says when the business is not part of the client', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients/cln-1/businesses/other');
    expect(await screen.findByText('Bisnis tidak ditemukan')).toBeInTheDocument();
  });
});

describe('brand page', () => {
  it('shows a custom business type, the colours, brand-only billing contacts and the breadcrumb', async () => {
    serve({ details: { 'cln-2': novaDetail() } });
    renderPages('/clients/cln-2/brands/brd-barber');
    expect(await main().findByRole('heading', { name: 'Nova Barber' })).toBeInTheDocument();
    await waitFor(() => expect(breadcrumb().getByRole('link', { name: 'NOVABARBER' })).toHaveAttribute('href', '/clients/cln-2/businesses/biz-barber'));
    expect(breadcrumb().getByRole('link', { name: 'Nova Beauty Salon' })).toBeInTheDocument();

    const profile = within(main().getByRole('region', { name: 'Profil brand' }));
    expect(profile.getByText('Barbershop')).toBeInTheDocument();
    expect(profile.getByText('#1F2937')).toBeInTheDocument();
    expect(profile.getAllByText('Belum diisi')).toHaveLength(2);

    const billing = within(main().getByRole('region', { name: 'Penagihan brand ini' }));
    // The brand answer resolves recipients from CORE; here they are the brand-only billing contact.
    expect(billing.queryByText('kontak penagihan khusus brand ini')).not.toBeInTheDocument();
    expect(main().getByText('Rudi Hartono')).toBeInTheDocument();
    expect(main().queryByText('Khusus brand Nova Barber')).not.toBeInTheDocument();
  });

  it('labels CONTACTS recipients narrowed to the brand as "kontak penagihan khusus brand ini"', async () => {
    const nova = novaDetail();
    serve({ details: { 'cln-2': nova } });
    // CORE answers the brand's own billing contacts first (recipientsFor).
    vi.unstubAllGlobals();
    mockFetch((call) => {
      const path = new URL(call.url).pathname;
      if (path === '/authorization/me') return envelope({ roles: ['SUPER_ADMIN'], permissions: ['*'] });
      if (path === '/clients/cln-2') return envelope(nova);
      if (path === '/clients/cln-2/brands/brd-barber')
        return envelope(brandDetail(nova, 'brd-barber', { recipients: { emails: ['rudi@nova-salon.invalid'], source: 'CONTACTS' } }));
      return envelope({ items: [], pagination: { page: 1, limit: 1, total: 0, total_pages: 1 } });
    });
    renderPages('/clients/cln-2/brands/brd-barber');
    const billing = within(await main().findByRole('region', { name: 'Penagihan brand ini' }));
    expect(billing.getByText('rudi@nova-salon.invalid')).toBeInTheDocument();
    expect(billing.getByText('kontak penagihan khusus brand ini')).toBeInTheDocument();
  });

  it('shows a master business type, two colours and no brand-only contacts', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients/cln-1/brands/brd-1');
    const profile = within(await main().findByRole('region', { name: 'Profil brand' }));
    expect(profile.getByText('Water Treatment')).toBeInTheDocument();
    expect(profile.getByText('#0E5FA8')).toBeInTheDocument();
    expect(profile.getByText('#7CC4F2')).toBeInTheDocument();
    expect(main().getByText('Tidak ada kontak khusus. Memakai kontak bisnis.')).toBeInTheDocument();
    expect(main().getByText('dari data klien')).toBeInTheDocument();
    for (const link of main().getAllByRole('link', { name: 'POSEIDON' })) expect(link).toHaveAttribute('href', '/clients/cln-1/businesses/biz-1');
  });

  it('says when the brand does not exist', async () => {
    serve({ details: { 'cln-1': detail() } });
    renderPages('/clients/cln-1/brands/missing');
    expect(await screen.findByText('Brand tidak ditemukan')).toBeInTheDocument();
  });
});

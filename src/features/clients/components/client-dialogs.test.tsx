import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes, useLocation } from 'react-router';
import { setDisplayLocale } from '../../../shared/format/locale';
import { client, detail } from '../../../test/clients-fixtures';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import type { ClientStatus } from '../clients-api';
import { CLIENT_TRANSITIONS, aliasFromName } from '../client-rules';
import { ClientDetailPage } from '../pages/client-detail-page';
import { ClientListPage } from '../pages/client-list-page';

const TYPES = [
  { id: 'bt-retail', code: 'RETAIL', name: 'Retail', status: 'ACTIVE', created_at: '', updated_at: '' },
  { id: 'bt-wt', code: 'WATER_TREATMENT', name: 'Water Treatment', status: 'ACTIVE', created_at: '', updated_at: '' },
];

function serve(options: { status?: ClientStatus; write?: (call: RecordedCall) => Response } = {}) {
  return mockFetch((call) => {
    const path = new URL(call.url).pathname;
    if (path === '/authorization/me') return envelope({ roles: ['SUPER_ADMIN'], permissions: ['*'] });
    if (path === '/business-types/active') return envelope({ items: TYPES });
    if (call.method === 'GET' && path === '/clients')
      return envelope({ items: [client()], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } });
    if (call.method === 'GET' && path === '/clients/cln-1') return envelope(detail({ status: options.status ?? 'ACTIVE' }));
    if (call.method === 'GET' && path === '/clients/cln-new') return envelope(detail({ id: 'cln-new', full_name: 'TEST Baru', status: 'DRAFT' }));
    if (call.method !== 'GET' && options.write) return options.write(call);
    return failure(404, 'NOT_FOUND');
  });
}

const writes = (calls: RecordedCall[]) => calls.filter((call) => call.method !== 'GET');

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderList() {
  return renderApp(
    <>
      <Routes>
        <Route path="/clients" element={<ClientListPage />} />
        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
      </Routes>
      <Where />
    </>,
    { path: '/*', route: '/clients' },
  );
}

async function openRegister() {
  renderList();
  fireEvent.click(await screen.findByRole('button', { name: 'Daftarkan klien' }));
  return within(await screen.findByRole('dialog'));
}

async function fillClient(dialog: ReturnType<typeof within>, name = 'Poseidon Filter') {
  fireEvent.change(dialog.getByLabelText('Nama klien'), { target: { value: name } });
  fireEvent.change(dialog.getByLabelText('Email'), { target: { value: 'owner@poseidon-filter.invalid' } });
  fireEvent.change(dialog.getByLabelText('Telepon'), { target: { value: '0812 0000 0001' } });
}

async function chooseType(dialog: ReturnType<typeof within>, name: string) {
  fireEvent.click(dialog.getByRole('button', { name: /Jenis usaha/ }));
  fireEvent.click(await screen.findByRole('option', { name }));
}

const submitRegister = (dialog: ReturnType<typeof within>) =>
  fireEvent.click(dialog.getAllByRole('button', { name: 'Daftarkan klien' }).at(-1)!);

beforeEach(() => setDisplayLocale('id-ID'));
afterEach(() => vi.unstubAllGlobals());

describe('client rules', () => {
  it('mirrors the CORE transition table', () => {
    expect(CLIENT_TRANSITIONS).toEqual({
      DRAFT: ['ACTIVE', 'ARCHIVED'],
      ACTIVE: ['SUSPENDED', 'ARCHIVED'],
      SUSPENDED: ['ACTIVE', 'ARCHIVED'],
      ARCHIVED: ['ACTIVE'],
    });
  });

  it('suggests the alias from the first word of the client name', () => {
    expect(aliasFromName('Poseidon Filter')).toBe('POSEIDON');
    expect(aliasFromName('  kopi-senja nusantara')).toBe('KOPI-SENJA');
    expect(aliasFromName('Café Ümit')).toBe('CAF');
    expect(aliasFromName('A'.repeat(30))).toHaveLength(20);
  });
});

describe('register client', () => {
  it('fills the alias from the name until it is edited, and always uppercases it', async () => {
    serve();
    const dialog = await openRegister();
    const alias = dialog.getByLabelText('Alias bisnis');
    fireEvent.change(dialog.getByLabelText('Nama klien'), { target: { value: 'Nova Beauty Salon' } });
    expect(alias).toHaveValue('NOVA');
    fireEvent.change(alias, { target: { value: 'nova-salon' } });
    expect(alias).toHaveValue('NOVA-SALON');
    fireEvent.change(dialog.getByLabelText('Nama klien'), { target: { value: 'Other Name' } });
    expect(alias).toHaveValue('NOVA-SALON');
  });

  it('sends the brand with a master business type and opens the new client', async () => {
    const { calls } = serve({ write: () => envelope({ message: 'ok', client_id: 'cln-new' }, 201) });
    const dialog = await openRegister();
    await fillClient(dialog);
    fireEvent.change(dialog.getByLabelText(/Nama badan hukum/), { target: { value: 'PT Poseidon Filter Indonesia' } });
    fireEvent.change(dialog.getByLabelText('Nama brand'), { target: { value: 'Poseidon Filter' } });
    await chooseType(dialog, 'Water Treatment');
    submitRegister(dialog);

    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect(writes(calls)[0].body).toEqual({
      full_name: 'Poseidon Filter',
      email: 'owner@poseidon-filter.invalid',
      phone: '0812 0000 0001',
      business: {
        alias: 'POSEIDON',
        legal: 'PT Poseidon Filter Indonesia',
        brand: { name: 'Poseidon Filter', business_type_id: 'bt-wt' },
      },
    });
    expect(await screen.findByText('Klien didaftarkan sebagai draf.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/clients/cln-new'));
  });

  it('does not send business.brand when the first brand is off', async () => {
    const { calls } = serve({ write: () => envelope({ message: 'ok', client_id: 'cln-new' }, 201) });
    const dialog = await openRegister();
    await fillClient(dialog, 'TEST Tanpa Brand');
    fireEvent.click(dialog.getByLabelText('Tambahkan brand pertama sekarang'));
    expect(dialog.getByText('Brand bisa ditambahkan nanti dari halaman klien.')).toBeInTheDocument();
    expect(dialog.queryByLabelText('Nama brand')).not.toBeInTheDocument();
    submitRegister(dialog);
    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    const body = writes(calls)[0].body as { business: Record<string, unknown> };
    expect(body.business).toEqual({ alias: 'TEST' });
  });

  it('sends a custom business type from "Lainnya…"', async () => {
    const { calls } = serve({ write: () => envelope({ message: 'ok', client_id: 'cln-new' }, 201) });
    const dialog = await openRegister();
    await fillClient(dialog);
    fireEvent.change(dialog.getByLabelText('Nama brand'), { target: { value: 'Nova Barber' } });
    await chooseType(dialog, 'Lainnya…');
    fireEvent.change(dialog.getByLabelText('Jenis usaha lainnya'), { target: { value: 'Barbershop' } });
    submitRegister(dialog);
    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect((writes(calls)[0].body as { business: { brand: unknown } }).business.brand).toEqual({
      name: 'Nova Barber',
      custom_business_type: 'Barbershop',
    });
  });

  it('checks the fields in the browser and focuses the first invalid one', async () => {
    const { calls } = serve();
    const dialog = await openRegister();
    fireEvent.change(dialog.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(dialog.getByLabelText('Telepon'), { target: { value: '021 555' } });
    fireEvent.change(dialog.getByLabelText('Alias bisnis'), { target: { value: 'NO SPACE' } });
    submitRegister(dialog);

    expect(await dialog.findByText('Format email belum benar.')).toBeInTheDocument();
    expect(dialog.getByText('Nomor telepon belum benar. Gunakan 08…, 62…, atau +62….')).toBeInTheDocument();
    expect(dialog.getByText('Hanya huruf besar, angka, dan tanda hubung, maksimal 20.')).toBeInTheDocument();
    expect(dialog.getByText('Pilih jenis usaha.')).toBeInTheDocument();
    expect(dialog.getAllByText('Wajib diisi.')).toHaveLength(2);
    await waitFor(() => expect(dialog.getByLabelText('Nama klien')).toHaveFocus());
    expect(writes(calls)).toHaveLength(0);
  });

  it.each([
    ['the alias', () => failure(409, 'BUSINESS_ALIAS_CONFLICT'), 'Alias bisnis', 'Alias ini sudah dipakai klien lain.'],
    ['the brand name', () => failure(409, 'BRAND_NAME_CONFLICT'), 'Nama brand', 'Nama brand ini sudah dipakai di klien ini.'],
    [
      'the phone',
      () => failure(400, 'VALIDATION_ERROR', [{ field: 'phone', reason: 'phone_format', message: 'Use 08…' }]),
      'Telepon',
      'Nomor telepon belum benar. Gunakan 08…, 62…, atau +62….',
    ],
  ])('shows a refusal of %s under its field', async (_, answer, label, message) => {
    serve({ write: answer });
    const dialog = await openRegister();
    await fillClient(dialog);
    fireEvent.change(dialog.getByLabelText('Nama brand'), { target: { value: 'Poseidon Filter' } });
    await chooseType(dialog, 'Retail');
    submitRegister(dialog);
    expect(await dialog.findByText(message)).toBeInTheDocument();
    expect(dialog.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
  });
});

async function openDetail(status: ClientStatus = 'ACTIVE', write?: (call: RecordedCall) => Response) {
  const fetch = serve({ status, write });
  renderApp(<ClientDetailPage />, { path: '/clients/:clientId', route: '/clients/cln-1' });
  await screen.findByRole('heading', { name: 'Poseidon Filter' });
  // The actions appear once GET /authorization/me has answered.
  await screen.findByRole('button', { name: 'Ubah status' });
  return fetch;
}

describe('edit client', () => {
  it('saves only on change and sends only the changed fields', async () => {
    const { calls } = await openDetail('ACTIVE', () => envelope({ message: 'ok', client_id: 'cln-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ubah data' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Kode DCLN-261124-0001 tidak bisa diubah.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Telepon')).toHaveValue('0812 0000 0001');
    const save = dialog.getByRole('button', { name: 'Simpan' });
    expect(save).toBeDisabled();

    // The same number typed another way is not a change.
    fireEvent.change(dialog.getByLabelText('Telepon'), { target: { value: '+62 812 0000 0001' } });
    expect(save).toBeDisabled();
    fireEvent.change(dialog.getByLabelText(/Alamat/), { target: { value: 'Jl. Baru No. 9' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect(writes(calls)[0].body).toEqual({ address: 'Jl. Baru No. 9' });
    expect(await screen.findByText('Data klien disimpan.')).toBeInTheDocument();
  });

  it('does not let the phone be cleared', async () => {
    const { calls } = await openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Ubah data' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Telepon'), { target: { value: '' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan' }));
    expect(await dialog.findByText('Nomor telepon tidak bisa dikosongkan.')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);
  });
});

describe('change status', () => {
  it.each([
    ['DRAFT', ['Aktifkan', 'Batalkan pendaftaran']],
    ['ACTIVE', ['Tangguhkan', 'Arsipkan']],
    ['SUSPENDED', ['Aktifkan lagi', 'Arsipkan']],
    ['ARCHIVED', ['Aktifkan lagi']],
  ] as const)('offers only the allowed transitions from %s', async (status, labels) => {
    await openDetail(status);
    fireEvent.click(screen.getByRole('button', { name: 'Ubah status' }));
    const group = within(await screen.findByRole('radiogroup', { name: 'Status baru' }));
    expect(group.getAllByRole('radio')).toHaveLength(labels.length);
    for (const label of labels) expect(group.getByRole('radio', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
  });

  it('requires a choice and a reason, labels the button by the action, and uses danger to archive', async () => {
    const { calls } = await openDetail('ACTIVE', () => envelope({ message: 'ok', client_id: 'cln-1', status: 'ARCHIVED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ubah status' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan status' }));
    expect(await dialog.findByText('Pilih status baru.')).toBeInTheDocument();
    expect(dialog.getByText('Tulis alasannya.')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('radio', { name: /^Arsipkan/ }));
    const archive = dialog.getByRole('button', { name: 'Arsipkan' });
    expect(archive.className).toContain('app-action-danger');
    fireEvent.click(archive);
    expect(writes(calls)).toHaveLength(0);

    fireEvent.change(dialog.getByLabelText('Alasan'), { target: { value: 'Kontrak berakhir.' } });
    expect(dialog.getByText('17/500')).toBeInTheDocument();
    fireEvent.click(archive);
    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect(writes(calls)[0].body).toEqual({ target_status: 'ARCHIVED', reason: 'Kontrak berakhir.' });
    expect(await screen.findByText('Status klien menjadi Diarsipkan.')).toBeInTheDocument();
  });

  it('labels a non-archive action as primary', async () => {
    await openDetail('ACTIVE');
    fireEvent.click(screen.getByRole('button', { name: 'Ubah status' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('radio', { name: /^Tangguhkan/ }));
    expect(dialog.getByRole('button', { name: 'Tangguhkan' }).className).toContain('app-action-primary');
  });

  it('shows CLIENT_INVALID_TRANSITION as the danger alert', async () => {
    await openDetail('ACTIVE', () => failure(409, 'CLIENT_INVALID_TRANSITION'));
    fireEvent.click(screen.getByRole('button', { name: 'Ubah status' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('radio', { name: /^Tangguhkan/ }));
    fireEvent.change(dialog.getByLabelText('Alasan'), { target: { value: 'Pembayaran belum diterima.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Tangguhkan' }));
    expect(await dialog.findByText('Status klien sudah berubah')).toBeInTheDocument();
    expect(dialog.getByText('Muat ulang halaman untuk melihat status terbaru.')).toBeInTheDocument();
  });
});

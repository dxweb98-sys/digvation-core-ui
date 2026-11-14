import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { ClientDetailPage } from './client-detail-page';

const client = {
  id: 'client-1',
  code: 'NOVA',
  display_name: 'Nova',
  legal_name: 'PT Nova',
  status: 'ACTIVE',
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  brands: [],
  contacts: [],
  credit: [{ currency: 'IDR', amount: '150000000' }],
};

function serve(permissions: string[]) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: [], permissions });
    if (path === '/clients/client-1' && call.method === 'GET') return envelope(client);
    if (path === '/clients/client-1/status') return failure(409, 'CLIENT_HAS_OPEN_SERVICES');
    return failure(404, 'NOT_FOUND');
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('client detail', () => {
  it('shows the client and its credit in whole rupiah', async () => {
    serve(['clients.read']);
    renderApp(<ClientDetailPage />, { path: '/clients/:clientId', route: '/clients/client-1' });

    expect(await screen.findByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit client' })).not.toBeInTheDocument();
  });

  it('explains why CORE refuses to archive a client with open services', async () => {
    const { calls } = serve(['clients.read', 'clients.lifecycle.manage']);
    renderApp(<ClientDetailPage />, { path: '/clients/:clientId', route: '/clients/client-1' });

    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Contract ended' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));

    expect(await within(dialog).findByText(/masih punya layanan yang belum ditutup/)).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      target_status: 'ARCHIVED',
      reason: 'Contract ended',
    });
  });
});

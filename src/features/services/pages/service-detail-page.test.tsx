import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { SERVICE_TRANSITIONS, isOpenService } from '../services-api';
import { ServiceDetailPage } from './service-detail-page';

const service = {
  id: 'svc-1',
  client_id: 'client-1',
  brand: { id: 'brand-1', code: 'NOVA', name: 'Nova' },
  product: { id: 'prod-1', code: 'POS', name: 'Digvation POS' },
  status: 'ACTIVE',
  features: [{ id: 'f1', code: 'COMMISSION', name: 'Commission', scope: 'PRODUCT', status: 'ACTIVE' }],
  add_ons: [],
  status_changed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function serve(permissions: string[]) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: [], permissions });
    if (path === '/clients/client-1/services/svc-1') return envelope(service);
    if (path.endsWith('/features') || path.endsWith('/add-ons')) return envelope({ items: [] });
    if (path === '/clients/client-1/services/svc-1/status') return envelope({ message: 'ok' });
    return failure(404, 'NOT_FOUND');
  });
}

const route = { path: '/clients/:clientId/services/:serviceId', route: '/clients/client-1/services/svc-1' };

afterEach(() => vi.unstubAllGlobals());

describe('service lifecycle', () => {
  it('follows core-v2 client-service.lifecycle.ts', () => {
    expect(SERVICE_TRANSITIONS.PROVISIONING).toEqual(['TRIAL', 'ACTIVE', 'CANCELLED']);
    expect(SERVICE_TRANSITIONS.CANCELLED).toEqual(['DECOMMISSIONED']);
    expect(isOpenService('SUSPENDED')).toBe(true);
    expect(isOpenService('CANCELLED')).toBe(false);
  });
});

describe('service page', () => {
  it('shows the service read-only without services.manage', async () => {
    serve(['services.read', 'catalog.read']);
    renderApp(<ServiceDetailPage />, route);

    expect(await screen.findByRole('heading', { name: 'Digvation POS for Nova' })).toBeInTheDocument();
    expect(screen.getByText('Commission')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change features' })).not.toBeInTheDocument();
  });

  it('cancels with a reason', async () => {
    const { calls } = serve(['services.read', 'services.manage', 'catalog.read']);
    renderApp(<ServiceDetailPage />, route);

    expect(await screen.findByRole('button', { name: 'Suspend' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Client stopped' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' }).at(-1)!);

    await screen.findByText('Service status changed');
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      target_status: 'CANCELLED',
      reason: 'Client stopped',
    });
  });
});

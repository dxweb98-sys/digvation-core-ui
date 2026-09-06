import { describe, expect, it } from 'vitest';
import { createMockClientDataSource } from './mock-client-data-source';

describe('mock client data source', () => {
  it('filters the client list through the query boundary', async () => {
    const dataSource = createMockClientDataSource();

    const result = await dataSource.getClients({
      search: 'pt fortuna',
      status: 'SUSPENDED',
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.clients[0]).toMatchObject({ code: 'FORTUNA', status: 'SUSPENDED' });
  });

  it('normalizes a new client code and exposes the created detail', async () => {
    const dataSource = createMockClientDataSource();

    const detail = await dataSource.createClient({
      code: ' acme group ',
      displayName: 'Acme Group',
      legalName: '',
    });

    expect(detail.client).toMatchObject({ code: 'ACME-GROUP', displayName: 'Acme Group', status: 'ACTIVE' });
    expect(detail.activity[0]?.type).toBe('CLIENT_CREATED');
  });

  it('keeps client code immutable when information is updated', async () => {
    const dataSource = createMockClientDataSource();

    const detail = await dataSource.updateClient('client-nova', {
      displayName: 'Nova Salon Jakarta',
      legalName: 'PT Nova Beauty Indonesia',
    });

    expect(detail.client.code).toBe('NOVA');
    expect(detail.client.displayName).toBe('Nova Salon Jakarta');
    expect(detail.activity[0]?.type).toBe('CLIENT_UPDATED');
  });

  it('enforces valid lifecycle transitions with a reason', async () => {
    const dataSource = createMockClientDataSource();

    await expect(
      dataSource.transitionClientStatus({ clientId: 'client-nova', targetStatus: 'SUSPENDED', reason: '' }),
    ).rejects.toThrow('reason is required');

    const detail = await dataSource.transitionClientStatus({
      clientId: 'client-nova',
      targetStatus: 'SUSPENDED',
      reason: 'Temporary account review.',
    });

    expect(detail.client.status).toBe('SUSPENDED');
    expect(detail.activity[0]).toMatchObject({ type: 'CLIENT_STATUS_CHANGED', title: 'Client suspended' });
  });
});

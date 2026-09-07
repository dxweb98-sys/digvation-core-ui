import { describe, expect, it } from 'vitest';
import { createMockInstallationDataSource } from './mock-installation-data-source';

describe('mock installation data source', () => {
  it('filters installations through the query boundary', async () => {
    const dataSource = createMockInstallationDataSource();
    const result = await dataSource.getInstallations({ search: 'nova', status: 'ACTIVE', environment: 'PRODUCTION', page: 1, limit: 10 });
    expect(result.installations[0]).toMatchObject({ id: 'installation-nova-pos-production', code: 'NOVA-POS-PROD', deploymentMode: 'DEDICATED', infrastructureOwnership: 'DIGVATION' });
    await expect(dataSource.getInstallation('installation-nova-pos-production')).resolves.toMatchObject({ name: 'Nova POS Production', clientName: 'Nova Salon', productName: 'Digvation POS' });
  });
  it('preserves installation identity from every visible list record to detail lookup', async () => {
    const dataSource = createMockInstallationDataSource();
    const result = await dataSource.getInstallations({ search: '', status: 'ALL', environment: 'ALL', page: 1, limit: 10 });
    for (const installation of result.installations) {
      await expect(dataSource.getInstallation(installation.id)).resolves.toMatchObject({ id: installation.id, code: installation.code, name: installation.name });
    }
    await expect(dataSource.getInstallation('unavailable-installation')).resolves.toBeNull();
  });
  it('creates a provisioning installation for a client product without coupling deployment and ownership', async () => {
    const dataSource = createMockInstallationDataSource();
    const installation = await dataSource.createInstallation({ clientProductId: 'client-product-poseidon-site', code: ' poseidon staging ', name: 'Poseidon Staging', environment: 'STAGING', deploymentMode: 'DEDICATED', infrastructureOwnership: 'CLIENT', managedByDigvation: true, region: '', applicationUrl: '' });
    expect(installation).toMatchObject({ code: 'POSEIDON-STAGING', status: 'PROVISIONING', deploymentMode: 'DEDICATED', infrastructureOwnership: 'CLIENT', managedByDigvation: true });
  });
  it('enforces valid lifecycle transitions with a reason', async () => {
    const dataSource = createMockInstallationDataSource();
    await expect(dataSource.transitionInstallationStatus({ installationId: 'installation-nova-pos-production', targetStatus: 'SUSPENDED', reason: '' })).rejects.toThrow('reason is required');
    await expect(dataSource.transitionInstallationStatus({ installationId: 'installation-nova-pos-production', targetStatus: 'PROVISIONING', reason: 'Invalid transition.' })).rejects.toThrow('Cannot transition ACTIVE to PROVISIONING');
    await expect(dataSource.transitionInstallationStatus({ installationId: 'installation-nova-pos-production', targetStatus: 'SUSPENDED', reason: 'Account review.' })).resolves.toMatchObject({ status: 'SUSPENDED' });
  });
});

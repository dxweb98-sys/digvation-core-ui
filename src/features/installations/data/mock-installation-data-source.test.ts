import { describe, expect, it } from 'vitest';
import { createMockInstallationDataSource } from './mock-installation-data-source';

describe('mock installation data source', () => {
  it('filters Client-scoped installations through the query boundary', async () => {
    const dataSource = createMockInstallationDataSource();
    const result = await dataSource.getInstallations({
      search: 'nova',
      status: 'ACTIVE',
      environment: 'PRODUCTION',
      page: 1,
      limit: 10,
    });
    expect(result.installations[0]).toMatchObject({
      id: 'installation-nova-production',
      code: 'NOVA-PROD',
      clientId: 'client-nova',
      deploymentMode: 'DEDICATED',
      branding: { mode: 'WHITE_LABEL' },
    });
  });

  it('creates one Installation with multiple Client Products', async () => {
    const dataSource = createMockInstallationDataSource();
    const installation = await dataSource.createInstallation({
      clientId: 'client-nova',
      clientProductIds: ['client-product-nova-pos', 'client-product-nova-workshop'],
      code: ' nova staging ',
      name: 'Nova Staging',
      environment: 'STAGING',
      deploymentMode: 'SHARED',
      infrastructureOwnership: 'DIGVATION',
      managedByDigvation: true,
      branding: { mode: 'DIGVATION' },
    });
    expect(installation).toMatchObject({
      code: 'NOVA-STAGING',
      status: 'PROVISIONING',
      clientId: 'client-nova',
    });
    expect(installation.products).toHaveLength(2);
  });

  it('enforces white-label branding for Dedicated installations', async () => {
    const dataSource = createMockInstallationDataSource();
    await expect(
      dataSource.createInstallation({
        clientId: 'client-fortuna',
        clientProductIds: ['client-product-fortuna-pos'],
        code: 'FORTUNA-PROD',
        name: 'Fortuna Production',
        environment: 'PRODUCTION',
        deploymentMode: 'DEDICATED',
        infrastructureOwnership: 'CLIENT',
        managedByDigvation: false,
        branding: { mode: 'DIGVATION' },
      }),
    ).rejects.toThrow('require white-label branding');
  });

  it('keeps decommissioned installations terminal', async () => {
    const dataSource = createMockInstallationDataSource();
    await dataSource.transitionInstallationStatus({
      installationId: 'installation-nova-production',
      targetStatus: 'DECOMMISSIONED',
      reason: 'Environment retired.',
    });
    await expect(
      dataSource.transitionInstallationStatus({
        installationId: 'installation-nova-production',
        targetStatus: 'ACTIVE',
        reason: 'Invalid reactivation.',
      }),
    ).rejects.toThrow('Cannot transition DECOMMISSIONED to ACTIVE');
  });
});

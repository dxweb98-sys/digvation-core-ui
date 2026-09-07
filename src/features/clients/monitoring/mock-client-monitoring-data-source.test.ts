import { describe, expect, it } from 'vitest';
import { createMockClientMonitoringDataSource } from './mock-client-monitoring-data-source';

describe('mock client monitoring data source', () => {
  it('returns only Client A products and installations, with state mapped to the correct installation', async () => {
    const monitoring = await createMockClientMonitoringDataSource().getClientMonitoring('client-nova');

    expect(monitoring.records).toHaveLength(2);
    expect(monitoring.records.every((record) => record.installation.clientId === 'client-nova')).toBe(true);
    expect(monitoring.records.map((record) => record.clientProduct.id)).toEqual(expect.arrayContaining(['client-product-nova-pos', 'client-product-nova-workshop']));
    const pos = monitoring.records.find((record) => record.installation.id === 'installation-nova-pos-production')!;
    expect(pos.health).toBe('DEGRADED');
    expect(pos.activeIncidents.map((incident) => incident.id)).toEqual(['incident-nova-worker']);
    expect(pos.currentDeployment?.version).toBe('v0.3.2');
  });

  it('returns only Client B dedicated operational state and its relevant infrastructure binding', async () => {
    const monitoring = await createMockClientMonitoringDataSource().getClientMonitoring('client-poseidon');

    expect(monitoring.records).toHaveLength(1);
    const record = monitoring.records[0];
    expect(record.installation.clientId).toBe('client-poseidon');
    expect(record.installation.deploymentMode).toBe('DEDICATED');
    expect(record.infrastructureBindings.map((binding) => binding.infrastructureNodeId)).toEqual(['node-poseidon-client-01']);
    expect(record.activeIncidents.map((incident) => incident.installationId)).toEqual(['installation-poseidon-site-production']);
    expect(record.runtimeServices.every((service) => service.installationId === record.installation.id)).toBe(true);
  });

  it('does not surface shared infrastructure topology as client-exclusive data', async () => {
    const monitoring = await createMockClientMonitoringDataSource().getClientMonitoring('client-nova');
    const shared = monitoring.records.find((record) => record.installation.id === 'installation-nova-workshop-staging')!;

    expect(shared.installation.deploymentMode).toBe('SHARED');
    expect(shared.infrastructureBindings).toEqual([]);
    expect(shared.maintenanceState).toBe('NOT_APPLICABLE');
  });

  it('keeps client scopes isolated when composing monitoring results', async () => {
    const source = createMockClientMonitoringDataSource();
    const [nova, poseidon] = await Promise.all([source.getClientMonitoring('client-nova'), source.getClientMonitoring('client-poseidon')]);

    expect(nova.records.some((record) => record.installation.clientId === 'client-poseidon')).toBe(false);
    expect(poseidon.records.some((record) => record.installation.clientId === 'client-nova')).toBe(false);
  });
});

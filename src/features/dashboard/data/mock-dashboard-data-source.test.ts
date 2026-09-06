import { describe, expect, it } from 'vitest';
import { createMockDashboardDataSource } from './mock-dashboard-data-source';

describe('mock dashboard data source', () => {
  it('provides coherent operational scenarios through the data-source contract', async () => {
    const dashboard = await createMockDashboardDataSource('populated').getOverview();

    expect(dashboard.attentionItems[0]).toMatchObject({
      severity: 'CRITICAL',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      probableCause: 'Out of memory',
    });
    expect(dashboard.infrastructure).toEqual(
      expect.arrayContaining([expect.objectContaining({ nodeName: 'stark' })]),
    );
    expect(dashboard.summary.openIncidentCount).toBe(2);
  });

  it('supports a controlled empty state without artificial delay', async () => {
    const dashboard = await createMockDashboardDataSource('empty').getOverview();

    expect(dashboard.summary.clientCount).toBe(0);
    expect(dashboard.attentionItems).toHaveLength(0);
    expect(dashboard.applicationHealth).toHaveLength(0);
  });

  it('supports a controlled recoverable error state', async () => {
    await expect(
      createMockDashboardDataSource('error').getOverview(),
    ).rejects.toThrow('Controlled mock dashboard failure.');
  });
});

import { describe, expect, it } from 'vitest';
import { createMockDashboardDataSource } from './mock-dashboard-data-source';
import { buildMockDashboardTrends } from './mock-dashboard-trends';

async function overview() {
  return createMockDashboardDataSource('populated').getOverview();
}

describe('provisional mock dashboard trends', () => {
  it('produces identical series for identical input', async () => {
    const { infrastructure, summary } = await overview();

    expect(buildMockDashboardTrends(infrastructure, summary)).toEqual(
      buildMockDashboardTrends(infrastructure, summary),
    );
  });

  it('stays stable across requests', async () => {
    const first = await overview();
    const second = await overview();

    expect(second.trends).toEqual(first.trends);
  });

  it('ends each resource series on the current snapshot reading', async () => {
    const { trends, infrastructure } = await overview();

    for (const range of ['24h', '7d'] as const) {
      for (const node of infrastructure) {
        const series = trends?.ranges[range].resources.find((item) => item.nodeId === node.id);
        const last = series?.points[series.points.length - 1];
        expect(last).toMatchObject({
          cpu: node.cpuUsagePercent,
          memory: node.memoryUsagePercent,
          disk: node.diskUsagePercent,
        });
      }
    }
  });

  it('keeps utilization in a realistic range', async () => {
    const { trends } = await overview();

    for (const series of trends?.ranges['7d'].resources ?? []) {
      for (const point of series.points) {
        for (const value of [point.cpu, point.memory, point.disk]) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(99);
        }
      }
    }
  });

  it('gives each range its own time span', async () => {
    const { trends } = await overview();
    const span = (range: '24h' | '7d') => {
      const points = trends?.ranges[range].deployments ?? [];
      return Date.parse(points[points.length - 1].at) - Date.parse(points[0].at);
    };

    expect(span('7d')).toBeGreaterThan(span('24h'));
  });

  it('ends the estate history on the KPI numbers', async () => {
    const { trends, summary } = await overview();

    expect(trends?.estate[trends.estate.length - 1]).toMatchObject({
      clientCount: summary.clientCount,
      managedInstallationCount: summary.managedInstallationCount,
      healthyInstallationCount: summary.healthyInstallationCount,
      openIncidentCount: summary.openIncidentCount,
    });
  });

  it('omits trends entirely rather than filling them with zeros', async () => {
    const withoutTrends = await createMockDashboardDataSource('no-trends').getOverview();
    const empty = await createMockDashboardDataSource('empty').getOverview();

    expect(withoutTrends.trends).toBeUndefined();
    expect(withoutTrends.infrastructure.length).toBeGreaterThan(0);
    expect(empty.trends).toBeUndefined();
  });
});

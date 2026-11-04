import type {
  DashboardSummary,
  DashboardTrendRange,
  DashboardTrends,
  EstateTrendPoint,
  InfrastructureSummary,
  ResourceTrendSeries,
} from '../types/dashboard';

const HOUR_MS = 3_600_000;
const SEED = 20261104;
// A fixed end time keeps the series stable across renders and test runs.
const TRENDS_END_MS = Date.UTC(2026, 10, 4, 12);

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clampPercent(value: number) {
  return Math.round(Math.min(99, Math.max(1, value)));
}

function timestamps(count: number, stepHours: number) {
  return Array.from({ length: count }, (_, index) =>
    new Date(TRENDS_END_MS - (count - 1 - index) * stepHours * HOUR_MS).toISOString(),
  );
}

/** Walks back from the current reading, so the last point matches the snapshot. */
function resourceSeries(
  node: InfrastructureSummary,
  times: string[],
  random: () => number,
): ResourceTrendSeries {
  const lastIndex = times.length - 1;
  const walk = (current: number, spread: number) =>
    times.map((_, index) => {
      if (index === lastIndex) return current;
      const distance = (lastIndex - index) / Math.max(lastIndex, 1);
      return clampPercent(current - distance * spread + (random() - 0.5) * spread * 0.6);
    });
  const cpu = walk(node.cpuUsagePercent, 22);
  const memory = walk(node.memoryUsagePercent, 28);
  const disk = walk(node.diskUsagePercent, 4);

  return {
    nodeId: node.id,
    nodeName: node.nodeName,
    points: times.map((at, index) => ({
      at,
      cpu: cpu[index],
      memory: memory[index],
      disk: disk[index],
    })),
  };
}

function activitySeries(times: string[], volume: number, random: () => number) {
  const count = (scale: number) => Math.floor(random() * volume * scale);
  return {
    deployments: times.map((at) => ({
      at,
      success: count(1),
      failed: count(0.25),
      inProgress: count(0.15),
      pending: count(0.1),
    })),
    events: times.map((at) => ({
      at,
      info: count(1.4),
      warning: count(0.7),
      critical: count(0.3),
    })),
  };
}

function estateSeries(summary: DashboardSummary, random: () => number): EstateTrendPoint[] {
  const times = timestamps(8, 24);
  const lastIndex = times.length - 1;
  const step = (current: number, previousDrift: number, index: number) =>
    index === lastIndex
      ? current
      : Math.max(0, current + Math.round((random() - 0.5) * 2 * previousDrift));

  return times.map((at, index) => ({
    at,
    clientCount: index < 3 ? Math.max(summary.clientCount - 1, 0) : summary.clientCount,
    managedInstallationCount: index < 2 ? Math.max(summary.managedInstallationCount - 1, 0) : summary.managedInstallationCount,
    healthyInstallationCount: step(summary.healthyInstallationCount, 2, index),
    openIncidentCount: step(summary.openIncidentCount, 1, index),
  }));
}

/**
 * PROVISIONAL: CORE has no dashboard endpoint yet and will own the final shape.
 * Seeded, so the same input always produces the same series.
 */
export function buildMockDashboardTrends(
  infrastructure: InfrastructureSummary[],
  summary: DashboardSummary,
): DashboardTrends {
  const random = seededRandom(SEED);
  const ranges = {} as DashboardTrends['ranges'];
  const plan: Array<[DashboardTrendRange, number, number, number, number, number]> = [
    ['24h', 24, 1, 12, 2, 2],
    ['7d', 28, 6, 7, 24, 6],
  ];

  for (const [range, resourceCount, resourceStep, activityCount, activityStep, volume] of plan) {
    const resourceTimes = timestamps(resourceCount, resourceStep);
    ranges[range] = {
      resources: infrastructure.map((node) => resourceSeries(node, resourceTimes, random)),
      ...activitySeries(timestamps(activityCount, activityStep), volume, random),
    };
  }

  return { ranges, estate: estateSeries(summary, random) };
}

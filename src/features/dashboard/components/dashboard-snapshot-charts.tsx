import {
  CHART_COLORS,
  ColumnChart,
  DistributionChart,
  formatPercent,
  type DistributionRow,
} from '../../../shared/charts/charts';
import { GlowCard } from '../../../shared/ui/glow-card';
import type {
  AttentionSeverity,
  ClientApplicationHealth,
  DeploymentStatus,
  InfrastructureSummary,
  OperationalEvent,
  OperationalHealth,
  RecentDeployment,
} from '../types/dashboard';

export const RESOURCE_SERIES = [
  { key: 'cpu', label: 'CPU', color: CHART_COLORS.series1 },
  { key: 'memory', label: 'Memory', color: CHART_COLORS.series2 },
  { key: 'disk', label: 'Disk', color: CHART_COLORS.series3 },
];

export const RESOURCE_THRESHOLDS = [
  { value: 75, label: 'Elevated 75%', color: CHART_COLORS.warning },
  { value: 90, label: 'Critical 90%', color: CHART_COLORS.danger },
];

const HEALTH_ROWS: Array<{ status: OperationalHealth; label: string; color: string }> = [
  { status: 'HEALTHY', label: 'Healthy', color: CHART_COLORS.success },
  { status: 'DEGRADED', label: 'Degraded', color: CHART_COLORS.warning },
  { status: 'CRITICAL', label: 'Critical', color: CHART_COLORS.danger },
  { status: 'MAINTENANCE', label: 'Maintenance', color: CHART_COLORS.info },
  { status: 'UNKNOWN', label: 'Unknown', color: CHART_COLORS.neutral },
];

const DEPLOYMENT_ROWS: Array<{ status: DeploymentStatus; label: string; color: string }> = [
  { status: 'SUCCESS', label: 'Success', color: CHART_COLORS.success },
  { status: 'FAILED', label: 'Failed', color: CHART_COLORS.danger },
  { status: 'IN_PROGRESS', label: 'In progress', color: CHART_COLORS.info },
  { status: 'PENDING', label: 'Pending', color: CHART_COLORS.neutral },
];

const SEVERITY_ROWS: Array<{ severity: AttentionSeverity; label: string; color: string }> = [
  { severity: 'CRITICAL', label: 'Critical', color: CHART_COLORS.danger },
  { severity: 'WARNING', label: 'Warning', color: CHART_COLORS.warning },
  { severity: 'INFO', label: 'Info', color: CHART_COLORS.info },
];

function countBy<T>(items: T[], matches: (item: T) => boolean) {
  return items.filter(matches).length;
}

export function installationHealthRows(applications: ClientApplicationHealth[]): DistributionRow[] {
  return HEALTH_ROWS.map(({ status, label, color }) => ({
    key: status,
    label,
    color,
    value: countBy(applications, (application) => application.status === status),
  }));
}

export function deploymentOutcomeRows(deployments: RecentDeployment[]): DistributionRow[] {
  return DEPLOYMENT_ROWS.map(({ status, label, color }) => ({
    key: status,
    label,
    color,
    value: countBy(deployments, (deployment) => deployment.status === status),
  }));
}

export function eventSeverityRows(events: OperationalEvent[]): DistributionRow[] {
  return SEVERITY_ROWS.map(({ severity, label, color }) => ({
    key: severity,
    label,
    color,
    value: countBy(events, (event) => event.severity === severity),
  }));
}

export function DashboardSnapshotCharts({
  applications,
  deployments,
  events,
}: {
  applications: ClientApplicationHealth[];
  deployments: RecentDeployment[];
  events: OperationalEvent[];
}) {
  return (
    <>
      <GlowCard className="bento-third">
        <DistributionChart
          description="Installations by current health."
          rows={installationHealthRows(applications)}
          title="Installation health"
          valueLabel="Installations"
        />
      </GlowCard>
      <GlowCard className="bento-third">
        <DistributionChart
          description="Outcome of the most recent deployments."
          rows={deploymentOutcomeRows(deployments)}
          title="Recent deployment outcomes"
          valueLabel="Deployments"
        />
      </GlowCard>
      <GlowCard className="bento-third">
        <DistributionChart
          description="Severity of the most recent events."
          rows={eventSeverityRows(events)}
          title="Events by severity"
          valueLabel="Events"
        />
      </GlowCard>
    </>
  );
}

/** Compares nodes against the thresholds; it takes the full row when no trends sit beside it. */
export function DashboardNodeComparison({
  infrastructure,
  hasTrends,
}: {
  infrastructure: InfrastructureSummary[];
  hasTrends: boolean;
}) {
  if (infrastructure.length === 0) return null;

  return (
    <GlowCard className={hasTrends ? 'bento-compare' : 'bento-full'}>
      <ColumnChart
        data={infrastructure.map((node) => ({
          node: node.nodeName,
          cpu: node.cpuUsagePercent,
          memory: node.memoryUsagePercent,
          disk: node.diskUsagePercent,
        }))}
        description="Current utilization against the thresholds."
        format={formatPercent}
        series={RESOURCE_SERIES}
        thresholds={RESOURCE_THRESHOLDS}
        title="Node resource utilization"
        xKey="node"
        xLabel="Node"
        yMax={100}
      />
    </GlowCard>
  );
}

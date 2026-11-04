import { DButton, DEmptyState } from '@digvation/ui';
import { useState } from 'react';
import {
  AreaTrendChart,
  CHART_COLORS,
  ColumnChart,
  formatCount,
  formatPercent,
} from '../../../shared/charts/charts';
import { AnimatedNumber } from '../../../shared/ui/animated-number';
import { GlowCard } from '../../../shared/ui/glow-card';
import type {
  DashboardTrendRange,
  DashboardTrends,
  ResourceTrendPoint,
  ResourceTrendSeries,
} from '../types/dashboard';
import { RESOURCE_SERIES, RESOURCE_THRESHOLDS } from './dashboard-snapshot-charts';

const RANGES: Array<{ value: DashboardTrendRange; label: string; description: string }> = [
  { value: '24h', label: '24h', description: 'Last 24 hours.' },
  { value: '7d', label: '7d', description: 'Last 7 days.' },
];

const DEPLOYMENT_SERIES = [
  { key: 'success', label: 'Success', color: CHART_COLORS.success },
  { key: 'failed', label: 'Failed', color: CHART_COLORS.danger },
  { key: 'inProgress', label: 'In progress', color: CHART_COLORS.info },
  { key: 'pending', label: 'Pending', color: CHART_COLORS.neutral },
];

const EVENT_SERIES = [
  { key: 'info', label: 'Info', color: CHART_COLORS.info },
  { key: 'warning', label: 'Warning', color: CHART_COLORS.warning },
  { key: 'critical', label: 'Critical', color: CHART_COLORS.danger },
];

const RESOURCE_KEYS = ['cpu', 'memory', 'disk'] as const;
const RESOURCE_LABELS = { cpu: 'CPU', memory: 'Memory', disk: 'Disk' };

const HOUR_FORMAT = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const DAY_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

function timeFormatter(range: DashboardTrendRange) {
  const format = range === '24h' ? HOUR_FORMAT : DAY_FORMAT;
  return (value: string) => format.format(new Date(value));
}

function latestPressure(point: ResourceTrendPoint) {
  return RESOURCE_KEYS.reduce((top, key) => (point[key] > point[top] ? key : top), RESOURCE_KEYS[0]);
}

/** The node under the most pressure right now is the one worth opening on. */
function busiestNode(resources: ResourceTrendSeries[]) {
  const latest = (node: ResourceTrendSeries) => {
    const point = node.points[node.points.length - 1];
    return point ? point[latestPressure(point)] : 0;
  };
  return resources.reduce<ResourceTrendSeries | undefined>(
    (top, node) => (!top || latest(node) > latest(top) ? node : top),
    undefined,
  );
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div aria-label={label} className="dashboard-range-toggle" role="group">
      {options.map((option) => (
        <DButton
          aria-pressed={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
          size="sm"
          variant={value === option.value ? 'primary' : 'outline'}
        >
          {option.label}
        </DButton>
      ))}
    </div>
  );
}

function HeroFigures({ node, range }: { node: ResourceTrendSeries; range: DashboardTrendRange }) {
  const latest = node.points[node.points.length - 1];
  if (!latest) return null;
  const top = latestPressure(latest);
  const peak = Math.max(...node.points.map((point) => point[top]));

  return (
    <div className="hero-figures">
      <AnimatedNumber className="hero-figure-value" format={formatPercent} value={latest[top]} />
      <span>{RESOURCE_LABELS[top]} now</span>
      <span>
        Peak <AnimatedNumber className="hero-figure-peak" format={formatPercent} value={peak} /> in {range}
      </span>
    </div>
  );
}

/** PROVISIONAL: reads the mock-only trends until CORE owns a dashboard contract. */
export function DashboardHeroTrend({
  trends,
  range,
  onRangeChange,
}: {
  trends?: DashboardTrends;
  range: DashboardTrendRange;
  onRangeChange: (range: DashboardTrendRange) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const resources = trends?.ranges[range].resources ?? [];
  const node = resources.find((item) => item.nodeId === selectedNodeId) ?? busiestNode(resources);

  if (!node) {
    return (
      <GlowCard className="bento-hero bento-hero-empty">
        <DEmptyState
          title="No trend history yet"
          description="Trends will appear once the control plane records dashboard history."
        />
      </GlowCard>
    );
  }

  return (
    <GlowCard className="bento-hero">
      <AreaTrendChart
        actions={(
          <>
            {resources.length > 1 ? (
              <ToggleGroup
                label="Trend node"
                onChange={setSelectedNodeId}
                options={resources.map((item) => ({ value: item.nodeId, label: item.nodeName }))}
                value={node.nodeId}
              />
            ) : null}
            <ToggleGroup label="Trend range" onChange={onRangeChange} options={RANGES} value={range} />
          </>
        )}
        data={node.points}
        format={formatPercent}
        lead={<HeroFigures node={node} range={range} />}
        series={RESOURCE_SERIES}
        thresholds={RESOURCE_THRESHOLDS}
        title={`${node.nodeName} utilization`}
        xFormat={timeFormatter(range)}
        xKey="at"
        xLabel="Time"
        yMax={100}
      />
    </GlowCard>
  );
}

export function DashboardActivityTrends({
  trends,
  range,
}: {
  trends?: DashboardTrends;
  range: DashboardTrendRange;
}) {
  const series = trends?.ranges[range];
  if (!series) return null;

  const xFormat = timeFormatter(range);
  const description = RANGES.find((option) => option.value === range)?.description;

  return (
    <>
      <GlowCard className="bento-trend">
        <ColumnChart
          data={series.deployments}
          description={description}
          format={formatCount}
          series={DEPLOYMENT_SERIES}
          stacked
          title="Deployments over time"
          xFormat={xFormat}
          xKey="at"
          xLabel="Time"
        />
      </GlowCard>
      <GlowCard className="bento-trend">
        <ColumnChart
          data={series.events}
          description={description}
          format={formatCount}
          series={EVENT_SERIES}
          stacked
          title="Events over time"
          xFormat={xFormat}
          xKey="at"
          xLabel="Time"
        />
      </GlowCard>
    </>
  );
}

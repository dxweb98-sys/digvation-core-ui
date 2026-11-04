import { MiniBars } from '../../../shared/charts/mini-bars';
import { RingGauge, type GaugeTone } from '../../../shared/charts/ring-gauge';
import { Sparkline } from '../../../shared/charts/charts';
import { AnimatedNumber } from '../../../shared/ui/animated-number';
import { GlowCard } from '../../../shared/ui/glow-card';
import type {
  ClientApplicationHealth,
  DashboardSummary as DashboardSummaryData,
  EstateTrendPoint,
} from '../types/dashboard';

const DAY_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

/** The ring speaks for the estate's actual statuses rather than a new ratio policy. */
function healthTone(applications: ClientApplicationHealth[]): GaugeTone {
  if (applications.some((application) => application.status === 'CRITICAL')) return 'critical';
  if (applications.some((application) => application.status === 'DEGRADED')) return 'warning';
  return 'normal';
}

function overSevenDays(label: string, estate: EstateTrendPoint[], key: keyof DashboardSummaryData) {
  return `${label} over 7 days: from ${estate[0][key]} to ${estate[estate.length - 1][key]}`;
}

function KpiCard({
  label,
  value,
  supporting,
  tone,
  children,
  aside,
}: {
  label: string;
  value: number;
  supporting: string;
  tone?: 'accent' | 'danger';
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <GlowCard className="bento-kpi kpi-card" tone={tone}>
      <div className="kpi-card-body">
        <div>
          <p className="summary-label">{label}</p>
          <AnimatedNumber className="kpi-card-value" value={value} />
          <p className="summary-supporting-label">{supporting}</p>
        </div>
        {aside}
      </div>
      {children}
    </GlowCard>
  );
}

export function DashboardSummary({
  summary,
  criticalAttentionCount,
  applications,
  estate,
}: {
  summary: DashboardSummaryData;
  criticalAttentionCount: number;
  applications: ClientApplicationHealth[];
  estate?: EstateTrendPoint[];
}) {
  const healthyShare = summary.managedInstallationCount === 0
    ? 0
    : (summary.healthyInstallationCount / summary.managedInstallationCount) * 100;
  const hasHistory = Boolean(estate?.length);

  return (
    <>
      <h2 className="visually-hidden">Operational summary</h2>
      <KpiCard
        label="Clients"
        supporting="Managed across the estate"
        value={summary.clientCount}
      >
        {hasHistory && estate ? (
          <Sparkline
            data={estate}
            dataKey="clientCount"
            label={overSevenDays('Clients', estate, 'clientCount')}
          />
        ) : null}
      </KpiCard>
      <KpiCard
        label="Managed installations"
        supporting={`${summary.healthyInstallationCount} healthy`}
        value={summary.managedInstallationCount}
      >
        {hasHistory && estate ? (
          <Sparkline
            data={estate}
            dataKey="managedInstallationCount"
            label={overSevenDays('Managed installations', estate, 'managedInstallationCount')}
          />
        ) : null}
      </KpiCard>
      <KpiCard
        aside={(
          <RingGauge
            description={`${Math.round(healthyShare)}% of ${summary.managedInstallationCount} managed installations are healthy`}
            label="Healthy share"
            tone={healthTone(applications)}
            value={healthyShare}
          />
        )}
        label="Healthy installations"
        supporting={`${summary.managedInstallationCount - summary.healthyInstallationCount} need review`}
        value={summary.healthyInstallationCount}
      />
      <KpiCard
        label="Open incidents"
        supporting={`${criticalAttentionCount} critical investigation${criticalAttentionCount === 1 ? '' : 's'}`}
        tone={criticalAttentionCount > 0 ? 'danger' : 'accent'}
        value={summary.openIncidentCount}
      >
        {hasHistory && estate ? (
          <MiniBars
            highlight={criticalAttentionCount > 0 ? 'danger' : 'accent'}
            label={overSevenDays('Open incidents', estate, 'openIncidentCount')}
            points={estate.map((point) => ({
              label: DAY_FORMAT.format(new Date(point.at)),
              value: point.openIncidentCount,
            }))}
            valueLabel="Open incidents"
          />
        ) : null}
      </KpiCard>
    </>
  );
}

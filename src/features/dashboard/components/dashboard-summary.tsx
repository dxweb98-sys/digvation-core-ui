import { DCard, DCardContent } from '@digvation-labs/ui';
import type { DashboardSummary as DashboardSummaryData } from '../types/dashboard';

const SUMMARY_ITEMS: Array<{
  key: keyof DashboardSummaryData;
  label: string;
  supportingLabel: (summary: DashboardSummaryData) => string;
  tone: string;
}> = [
  {
    key: 'clientCount',
    label: 'Clients',
    supportingLabel: () => 'Managed across the estate',
    tone: 'neutral',
  },
  {
    key: 'managedInstallationCount',
    label: 'Managed installations',
    supportingLabel: (summary) => `${summary.healthyInstallationCount} healthy`,
    tone: 'neutral',
  },
  {
    key: 'healthyInstallationCount',
    label: 'Healthy installations',
    supportingLabel: (summary) =>
      `${summary.managedInstallationCount - summary.healthyInstallationCount} need review`,
    tone: 'healthy',
  },
  {
    key: 'openIncidentCount',
    label: 'Open incidents',
    supportingLabel: () => '',
    tone: 'critical',
  },
];

function getSupportingLabel(
  item: (typeof SUMMARY_ITEMS)[number],
  summary: DashboardSummaryData,
  criticalAttentionCount: number,
) {
  if (item.key === 'openIncidentCount') {
    return `${criticalAttentionCount} critical investigation${
      criticalAttentionCount === 1 ? '' : 's'
    }`;
  }

  return item.supportingLabel(summary);
}

export function DashboardSummary({
  summary,
  criticalAttentionCount,
}: {
  summary: DashboardSummaryData;
  criticalAttentionCount: number;
}) {
  return (
    <section aria-labelledby="summary-title">
      <h2 className="visually-hidden" id="summary-title">Operational summary</h2>
      <div className="dashboard-summary-grid">
        {SUMMARY_ITEMS.map((item) => (
          <DCard className="summary-card" key={item.key} variant="outlined">
            <DCardContent>
              <p className="summary-label">{item.label}</p>
              <div className="summary-value-row">
                <strong>{summary[item.key]}</strong>
                <span
                  className={`summary-indicator summary-indicator-${item.tone}`}
                  aria-hidden="true"
                />
              </div>
              <p className="summary-supporting-label">
                {getSupportingLabel(item, summary, criticalAttentionCount)}
              </p>
            </DCardContent>
          </DCard>
        ))}
      </div>
    </section>
  );
}

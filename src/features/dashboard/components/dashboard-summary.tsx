import { DCard, DCardContent } from '@digvation-labs/ui';
import type { DashboardSummary as DashboardSummaryData } from '../types/dashboard';

const SUMMARY_ITEMS: Array<{
  key: keyof DashboardSummaryData;
  label: string;
  tone: string;
}> = [
  { key: 'clientCount', label: 'Clients', tone: 'neutral' },
  {
    key: 'managedInstallationCount',
    label: 'Managed installations',
    tone: 'neutral',
  },
  {
    key: 'healthyInstallationCount',
    label: 'Healthy installations',
    tone: 'healthy',
  },
  { key: 'openIncidentCount', label: 'Open incidents', tone: 'critical' },
];

export function DashboardSummary({ summary }: { summary: DashboardSummaryData }) {
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
            </DCardContent>
          </DCard>
        ))}
      </div>
    </section>
  );
}

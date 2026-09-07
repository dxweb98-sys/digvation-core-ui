import { DCard, DCardContent } from '@digvation/ui';
import type { ClientApplicationHealth, OperationalHealth } from '../types/dashboard';

const HEALTH_ORDER: OperationalHealth[] = [
  'HEALTHY',
  'DEGRADED',
  'CRITICAL',
  'UNKNOWN',
  'MAINTENANCE',
];

function getHealthCounts(applications: ClientApplicationHealth[]) {
  return applications.reduce<Record<OperationalHealth, number>>(
    (counts, application) => {
      counts[application.status] += 1;
      return counts;
    },
    { HEALTHY: 0, DEGRADED: 0, CRITICAL: 0, UNKNOWN: 0, MAINTENANCE: 0 },
  );
}

export function OperationalHealthSummary({
  applications,
}: {
  applications: ClientApplicationHealth[];
}) {
  const healthCounts = getHealthCounts(applications);
  const totalCount = applications.length;

  return (
    <section aria-labelledby="operational-health-title">
      <DCard className="operational-health-card" variant="outlined">
        <DCardContent className="operational-health-content">
          <div>
            <p className="section-eyebrow">Current estate</p>
            <h2 id="operational-health-title">Operational health</h2>
            <p className="operational-health-caption">
              {totalCount} monitored installations across client environments
            </p>
          </div>
          <div className="health-composition" aria-label="Operational health distribution">
            <div className="health-strip" aria-hidden="true">
              {HEALTH_ORDER.map((status) =>
                healthCounts[status] > 0 ? (
                  <span
                    className={`health-strip-segment health-strip-${status.toLowerCase()}`}
                    key={status}
                    style={{ flexGrow: healthCounts[status] }}
                  />
                ) : null,
              )}
            </div>
            <div className="health-legend">
              {HEALTH_ORDER.map((status) => (
                <span key={status}>
                  <i className={`health-legend-marker health-legend-${status.toLowerCase()}`} aria-hidden="true" />
                  {status.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}{' '}
                  <strong>{healthCounts[status]}</strong>
                </span>
              ))}
            </div>
          </div>
        </DCardContent>
      </DCard>
    </section>
  );
}

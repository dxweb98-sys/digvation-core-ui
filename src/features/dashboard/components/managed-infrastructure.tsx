import { DCard, DCardContent, DProgress } from '@digvation-labs/ui';
import type { InfrastructureSummary } from '../types/dashboard';
import { OperationalHealthBadge } from './dashboard-status-badges';

export function ManagedInfrastructure({
  infrastructure,
}: {
  infrastructure: InfrastructureSummary[];
}) {
  return (
    <section className="dashboard-section" aria-labelledby="infrastructure-title">
      <div className="dashboard-section-heading compact-heading">
        <div>
          <p className="section-eyebrow">Digvation managed</p>
          <h2 id="infrastructure-title">Managed infrastructure</h2>
        </div>
        <span className="section-count">{infrastructure.length} nodes</span>
      </div>
      <div className="infrastructure-list">
        {infrastructure.map((node) => (
          <DCard key={node.id} variant="outlined">
            <DCardContent className="infrastructure-card-content">
              <div className="infrastructure-heading">
                <div>
                  <h3>{node.nodeName}</h3>
                  <p>{node.region} · {node.installationCount} installations</p>
                </div>
                <OperationalHealthBadge status={node.status} />
              </div>
              <div className="resource-metrics">
                <DProgress
                  label={`CPU ${node.cpuUsagePercent}%`}
                  value={node.cpuUsagePercent}
                />
                <DProgress
                  label={`Memory ${node.memoryUsagePercent}%`}
                  value={node.memoryUsagePercent}
                />
                <DProgress
                  label={`Disk ${node.diskUsagePercent}%`}
                  value={node.diskUsagePercent}
                />
              </div>
            </DCardContent>
          </DCard>
        ))}
      </div>
    </section>
  );
}

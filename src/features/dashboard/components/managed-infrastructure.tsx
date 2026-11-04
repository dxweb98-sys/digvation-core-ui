import { DEmptyState } from '@digvation/ui';
import { RingGauge, type GaugeTone } from '../../../shared/charts/ring-gauge';
import { GlowCard, type GlowTone } from '../../../shared/ui/glow-card';
import type { InfrastructureSummary, OperationalHealth } from '../types/dashboard';
import { OperationalHealthBadge } from './dashboard-status-badges';

function utilizationTone(value: number): GaugeTone {
  if (value >= 90) return 'critical';
  if (value >= 75) return 'warning';
  return 'normal';
}

function utilizationNote(tone: GaugeTone) {
  if (tone === 'critical') return 'Critical pressure';
  if (tone === 'warning') return 'Elevated';
  return undefined;
}

function nodeGlow(status: OperationalHealth): GlowTone {
  if (status === 'CRITICAL') return 'danger';
  if (status === 'DEGRADED') return 'warning';
  return 'accent';
}

function ResourceGauge({ label, value }: { label: string; value: number }) {
  const tone = utilizationTone(value);
  return <RingGauge label={label} note={utilizationNote(tone)} tone={tone} value={value} />;
}

export function ManagedInfrastructure({
  infrastructure,
}: {
  infrastructure: InfrastructureSummary[];
}) {
  return (
    <section aria-labelledby="infrastructure-title" className="bento-nodes">
      <h2 className="visually-hidden" id="infrastructure-title">Managed infrastructure</h2>
      {infrastructure.length === 0 ? (
        <GlowCard>
          <DEmptyState
            title="No managed nodes"
            description="Node utilization will appear when infrastructure is registered."
          />
        </GlowCard>
      ) : (
        infrastructure.map((node) => (
          <GlowCard as="article" className="node-card" key={node.id} tone={nodeGlow(node.status)}>
            <div className="node-card-heading">
              <div>
                <h3>{node.nodeName}</h3>
                <p>{node.region}, {node.installationCount} installations</p>
              </div>
              <OperationalHealthBadge status={node.status} />
            </div>
            <div className="node-card-gauges">
              <ResourceGauge label="CPU" value={node.cpuUsagePercent} />
              <ResourceGauge label="Memory" value={node.memoryUsagePercent} />
              <ResourceGauge label="Disk" value={node.diskUsagePercent} />
            </div>
          </GlowCard>
        ))
      )}
    </section>
  );
}

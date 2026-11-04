import { DEmptyState } from '@digvation/ui';
import { GlowCard, type GlowTone } from '../../../shared/ui/glow-card';
import type { AttentionItem } from '../types/dashboard';
import { AttentionSeverityBadge } from './dashboard-status-badges';

function attentionGlow(items: AttentionItem[]): GlowTone {
  if (items.some((item) => item.severity === 'CRITICAL')) return 'danger';
  if (items.some((item) => item.severity === 'WARNING')) return 'warning';
  return 'accent';
}

export function RequiresAttention({ items }: { items: AttentionItem[] }) {
  return (
    <GlowCard
      aria-labelledby="attention-title"
      as="section"
      className="bento-full attention-panel"
      tone={attentionGlow(items)}
    >
      <div className="dashboard-section-heading">
        <h2 id="attention-title">Requires attention</h2>
        <span className="section-count">{items.length} active</span>
      </div>

      {items.length === 0 ? (
        <DEmptyState
          title="No active operational issues"
          description="All monitored client applications are within their expected operating state."
        />
      ) : (
        <div className="attention-list">
          {items.map((item) => (
            <article
              className={`attention-card attention-card-${item.severity.toLowerCase()}`}
              key={item.id}
            >
              <div className="attention-primary">
                <div className="attention-context">
                  <AttentionSeverityBadge severity={item.severity} />
                  <span>{item.clientName}</span>
                  <span aria-hidden="true">/</span>
                  <span>{item.applicationName}</span>
                  <span className="environment-label">{item.environment}</span>
                </div>
                <h3>{item.problem}</h3>
                <p className="installation-name">{item.installationName}</p>
              </div>

              <div className="attention-diagnosis">
                <span className="detail-label">Probable cause</span>
                <strong>{item.probableCause ?? 'Investigation required'}</strong>
              </div>

              <div className="attention-evidence">
                <span className="detail-label">Evidence</span>
                <div className="evidence-list">
                  {item.evidence.map((evidence) => (
                    <span key={evidence}>{evidence}</span>
                  ))}
                </div>
              </div>

              <time className="attention-duration">{item.durationLabel}</time>
            </article>
          ))}
        </div>
      )}
    </GlowCard>
  );
}

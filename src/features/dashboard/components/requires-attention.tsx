import { DCard, DCardContent, DEmptyState } from '@digvation-labs/ui';
import type { AttentionItem } from '../types/dashboard';
import { AttentionSeverityBadge } from './dashboard-status-badges';

export function RequiresAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section className="dashboard-section" aria-labelledby="attention-title">
      <div className="dashboard-section-heading">
        <div>
          <p className="section-eyebrow">Priority queue</p>
          <h2 id="attention-title">Requires attention</h2>
        </div>
        <span className="section-count">{items.length} active</span>
      </div>

      {items.length === 0 ? (
        <DCard variant="outlined">
          <DCardContent>
            <DEmptyState
              title="No active operational issues"
              description="All monitored client applications are within their expected operating state."
            />
          </DCardContent>
        </DCard>
      ) : (
        <div className="attention-list">
          {items.map((item) => (
            <DCard
              className={`attention-card attention-card-${item.severity.toLowerCase()}`}
              key={item.id}
              variant="outlined"
            >
              <DCardContent className="attention-card-content">
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
              </DCardContent>
            </DCard>
          ))}
        </div>
      )}
    </section>
  );
}

import { DCard, DCardContent } from '@digvation/ui';
import type { OperationalEvent } from '../types/dashboard';
import { AttentionSeverityBadge } from './dashboard-status-badges';

export function RecentEvents({ events }: { events: OperationalEvent[] }) {
  return (
    <section className="dashboard-section" aria-labelledby="events-title">
      <div className="dashboard-section-heading compact-heading">
        <div>
          <p className="section-eyebrow">Operational timeline</p>
          <h2 id="events-title">Recent events</h2>
        </div>
      </div>
      <DCard variant="outlined">
        <DCardContent className="event-list">
          {events.length === 0 ? (
            <p className="section-empty-copy">No recent operational events.</p>
          ) : (
            events.map((event) => (
              <article className="event-item" key={event.id}>
                <time className="event-time">{event.occurredAtLabel}</time>
                <span
                  className={`event-marker event-marker-${event.severity.toLowerCase()}`}
                  aria-hidden="true"
                />
                <div className="event-content">
                  <div className="event-heading">
                    <h3>{event.title}</h3>
                    <AttentionSeverityBadge severity={event.severity} />
                  </div>
                  <p>{event.description}</p>
                  <div className="event-meta">
                    {event.clientName ? (
                      <span>{event.clientName} · {event.applicationName}</span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </DCardContent>
      </DCard>
    </section>
  );
}

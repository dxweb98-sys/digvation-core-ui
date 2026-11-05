import { useState } from 'react';
import { GlowCard } from '../../../shared/ui/glow-card';
import type {
  AttentionSeverity,
  DeploymentStatus,
  OperationalEvent,
  RecentDeployment,
} from '../types/dashboard';

type FeedTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

interface FeedItem {
  key: string;
  timeLabel: string;
  statusText: string;
  mark: string;
  tone: FeedTone;
  title: string;
  detail?: string;
  context?: string;
}

const SEVERITY_FEED: Record<AttentionSeverity, Pick<FeedItem, 'statusText' | 'mark' | 'tone'>> = {
  CRITICAL: { statusText: 'Critical', mark: '!!', tone: 'danger' },
  WARNING: { statusText: 'Warning', mark: '!', tone: 'warning' },
  INFO: { statusText: 'Info', mark: 'i', tone: 'info' },
};

const DEPLOYMENT_FEED: Record<DeploymentStatus, Pick<FeedItem, 'statusText' | 'mark' | 'tone'>> = {
  SUCCESS: { statusText: 'Success', mark: '✓', tone: 'success' },
  FAILED: { statusText: 'Failed', mark: '✕', tone: 'danger' },
  IN_PROGRESS: { statusText: 'In progress', mark: '…', tone: 'info' },
  PENDING: { statusText: 'Pending', mark: '·', tone: 'neutral' },
};

const UNIT_MINUTES: Record<string, number> = {
  second: 1 / 60,
  minute: 1,
  hour: 60,
  day: 1440,
  week: 10080,
  month: 43200,
};

/**
 * The overview only carries display labels, not timestamps, so age is read from the
 * label. Anything unreadable sorts last rather than guessing a position.
 */
export function feedLabelAgeMinutes(label: string) {
  const text = label.trim().toLowerCase();
  if (text.includes('moment') || text === 'now' || text === 'just now') return 0;
  if (text === 'yesterday') return UNIT_MINUTES.day;
  const match = text.match(/^(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago$/);
  return match ? Number(match[1]) * UNIT_MINUTES[match[2]] : Number.POSITIVE_INFINITY;
}

function feedItems(deployments: RecentDeployment[], events: OperationalEvent[]) {
  const items: FeedItem[] = [
    ...deployments.map((deployment) => ({
      ...DEPLOYMENT_FEED[deployment.status],
      key: `deployment-${deployment.id}`,
      timeLabel: deployment.deployedAtLabel,
      title: `Deploy ${deployment.version} to ${deployment.environment}`,
      context: `${deployment.clientName} / ${deployment.applicationName} / ${deployment.serviceName ?? 'Application'}`,
    })),
    ...events.map((event) => ({
      ...SEVERITY_FEED[event.severity],
      key: `event-${event.id}`,
      timeLabel: event.occurredAtLabel,
      title: event.title,
      detail: event.description,
      context: event.clientName ? `${event.clientName} / ${event.applicationName}` : undefined,
    })),
  ];

  return items
    .map((item, index) => ({ item, index, age: feedLabelAgeMinutes(item.timeLabel) }))
    .sort((left, right) => (left.age === right.age ? left.index - right.index : left.age - right.age))
    .map(({ item }) => item);
}

/** Items that arrive after first render slide in once; the first load stays still. */
function useNewKeys(keys: string[]) {
  const [known, setKnown] = useState(keys);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  if (keys.some((key) => !known.includes(key))) {
    setFresh(new Set(keys.filter((key) => !known.includes(key))));
    setKnown([...known, ...keys]);
  }

  return fresh;
}

export function ActivityFeed({
  deployments,
  events,
}: {
  deployments: RecentDeployment[];
  events: OperationalEvent[];
}) {
  const items = feedItems(deployments, events);
  const fresh = useNewKeys(items.map((item) => item.key));

  return (
    <GlowCard aria-labelledby="activity-feed-title" as="section" className="bento-feed activity-feed">
      <div className="activity-feed-heading">
        <h3 id="activity-feed-title">Recent activity</h3>
        <span className="section-count">{items.length} entries</span>
      </div>
      <div className="activity-feed-frame">
        {items.length === 0 ? (
          <p className="section-empty-copy">No recent deployments or operational events.</p>
        ) : (
          // Scrolls inside the card, so it has to be reachable from the keyboard.
          <ol aria-labelledby="activity-feed-title" className="activity-feed-list" tabIndex={0}>
            {items.map((item) => (
              <li
                className={`activity-feed-item activity-feed-${item.tone}${fresh.has(item.key) ? ' activity-feed-item-new' : ''}`}
                key={item.key}
              >
                <div className="activity-feed-status">
                  <span aria-hidden="true" className="activity-feed-mark">{item.mark}</span>
                  <span>{item.statusText}</span>
                  <time>{item.timeLabel}</time>
                </div>
                <p className="activity-feed-title">{item.title}</p>
                {item.detail ? <p>{item.detail}</p> : null}
                {item.context ? <p>{item.context}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </GlowCard>
  );
}

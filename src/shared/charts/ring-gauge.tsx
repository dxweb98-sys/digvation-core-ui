import type { CSSProperties } from 'react';

export type GaugeTone = 'normal' | 'warning' | 'critical';

const RADIUS = 28;

/**
 * One percentage as a ring. The fill runs once when the ring first renders; the tone
 * comes from the caller and the caller's note says the same in words.
 */
export function RingGauge({
  value,
  label,
  tone,
  note,
  description,
}: {
  value: number;
  label: string;
  tone: GaugeTone;
  note?: string;
  /** Replaces the default "label: value" accessible name when the ring needs context. */
  description?: string;
}) {
  const percent = Math.min(Math.max(value, 0), 100);
  const name = description ?? `${label}: ${Math.round(percent)}%${note ? `, ${note}` : ''}`;

  return (
    <div aria-label={name} className={`ring-gauge ring-gauge-${tone}`} role="img">
      <div className="ring-gauge-dial">
        <svg aria-hidden="true" viewBox="0 0 64 64">
          <circle className="ring-gauge-track" cx="32" cy="32" r={RADIUS} />
          <circle
            className="ring-gauge-value"
            cx="32"
            cy="32"
            pathLength={100}
            r={RADIUS}
            strokeDasharray="100"
            style={{ '--ring-offset': 100 - percent } as CSSProperties}
          />
        </svg>
        <span className="ring-gauge-text">{Math.round(percent)}%</span>
      </div>
      <span className="ring-gauge-label">{label}</span>
      {note ? <span className="ring-gauge-note">{note}</span> : null}
    </div>
  );
}

export interface MiniBarPoint {
  label: string;
  value: number;
}

/** A short series as bars, latest highlighted, with its values in a table twin. */
export function MiniBars({
  label,
  points,
  valueLabel,
  highlight = 'accent',
}: {
  label: string;
  points: MiniBarPoint[];
  valueLabel: string;
  highlight?: 'accent' | 'danger';
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="mini-bars-wrap">
      <div aria-label={label} className={`mini-bars mini-bars-${highlight}`} role="img">
        {points.map((point, index) => (
          <span
            className={index === points.length - 1 ? 'mini-bar mini-bar-latest' : 'mini-bar'}
            key={point.label}
            style={{ height: `${(point.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="visually-hidden">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr><th scope="col">Day</th><th scope="col">{valueLabel}</th></tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}><td>{point.label}</td><td>{point.value}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

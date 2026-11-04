import { DSkeleton } from '@digvation/ui';

export function ContentSkeleton({
  label,
  rows = 6,
  rowHeight = 44,
}: {
  label: string;
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <div className="content-skeleton" role="status">
      <span className="visually-hidden">{label}</span>
      <DSkeleton count={rows} height={rowHeight} className="content-skeleton-block" />
    </div>
  );
}

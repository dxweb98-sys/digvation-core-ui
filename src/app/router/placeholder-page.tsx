import { DBadge, DCard, DCardContent } from '@digvation/ui';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="placeholder-page" aria-labelledby="placeholder-title">
      <div className="placeholder-heading">
        <div>
          <h1 id="placeholder-title">{title}</h1>
          <p>{description}</p>
        </div>
        <DBadge variant="outline">Not implemented</DBadge>
      </div>
      <DCard variant="outlined">
        <DCardContent>
          <p className="placeholder-copy">
            This page is not available yet.
          </p>
        </DCardContent>
      </DCard>
    </section>
  );
}

import { DBadge, DCard, DCardContent } from '@digvation-labs/ui';

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
          <p className="page-eyebrow">Planned workspace</p>
          <h1 id="placeholder-title">{title}</h1>
          <p>{description}</p>
        </div>
        <DBadge variant="outline">Not implemented</DBadge>
      </div>
      <DCard variant="outlined">
        <DCardContent>
          <p className="placeholder-copy">
            This route is reserved to validate Control Center navigation. Its
            workflows and backend integration belong to a later approved checkpoint.
          </p>
        </DCardContent>
      </DCard>
    </section>
  );
}

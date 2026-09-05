import {
  DBadge,
  DCard,
  DCardContent,
  DConnectionError,
  DLoadingIndicator,
} from '@digvation-labs/ui';
import { useOverviewFoundation } from '../hooks/use-overview-foundation';

export function OverviewPage() {
  const foundationQuery = useOverviewFoundation();

  if (foundationQuery.isPending) {
    return (
      <div className="page-state" aria-label="Loading overview">
        <DLoadingIndicator label="Loading Control Center foundation" />
      </div>
    );
  }

  if (foundationQuery.isError) {
    return (
      <div className="page-state">
        <DConnectionError
          title="Overview unavailable"
          message="The foundation data source could not be read."
          isRetrying={foundationQuery.isFetching}
          onRetry={() => void foundationQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <section className="overview-page" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">Operations workspace</p>
          <h1 id="overview-title">Overview</h1>
          <p className="page-description">
            The application foundation is ready. Operational domains remain
            deliberately disconnected until their approved checkpoints.
          </p>
        </div>
        <DBadge variant="info" dot>{foundationQuery.data.dataSourceLabel}</DBadge>
      </div>

      <div className="foundation-grid" aria-label="Foundation readiness">
        {foundationQuery.data.capabilities.map((capability) => (
          <DCard key={capability.id} variant="outlined">
            <DCardContent className="foundation-card-content">
              <div className="foundation-card-heading">
                <h2>{capability.name}</h2>
                <DBadge
                  variant={capability.status === 'ready' ? 'success' : 'outline'}
                  dot={capability.status === 'ready'}
                >
                  {capability.status === 'ready' ? 'Ready' : 'Deferred'}
                </DBadge>
              </div>
              <p>{capability.description}</p>
            </DCardContent>
          </DCard>
        ))}
      </div>

      <DCard className="scope-note" variant="outlined">
        <DCardContent>
          <p className="scope-note-label">BF-01 boundary</p>
          <p>
            No production data, authentication, telemetry, incident workflow or
            operational action is connected in this checkpoint.
          </p>
        </DCardContent>
      </DCard>
    </section>
  );
}

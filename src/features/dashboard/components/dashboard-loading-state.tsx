import { DCard, DCardContent, DSkeleton } from '@digvation-labs/ui';

export function DashboardLoadingState() {
  return (
    <div className="dashboard-loading" aria-label="Loading operational dashboard">
      <div className="dashboard-summary-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <DCard key={index} variant="outlined">
            <DCardContent>
              <DSkeleton height={64} />
            </DCardContent>
          </DCard>
        ))}
      </div>
      <DCard variant="outlined">
        <DCardContent>
          <DSkeleton height={32} width="32%" />
          <DSkeleton count={3} height={84} />
        </DCardContent>
      </DCard>
    </div>
  );
}

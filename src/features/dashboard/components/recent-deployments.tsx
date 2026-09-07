import { DCard, DCardContent, DEmptyState } from '@digvation/ui';
import type { RecentDeployment } from '../types/dashboard';
import { DeploymentStatusBadge } from './dashboard-status-badges';

export function RecentDeployments({
  deployments,
}: {
  deployments: RecentDeployment[];
}) {
  return (
    <section className="dashboard-section" aria-labelledby="deployments-title">
      <div className="dashboard-section-heading compact-heading">
        <div>
          <p className="section-eyebrow">Release activity</p>
          <h2 id="deployments-title">Recent deployments</h2>
        </div>
      </div>
      <DCard className="deployment-card" variant="outlined">
        <DCardContent className="deployment-list">
          {deployments.length === 0 ? (
            <DEmptyState
              title="No recent deployments"
              description="Deployment activity will appear here when it is available."
            />
          ) : (
            deployments.map((deployment) => (
              <article
                className={`deployment-item deployment-item-${deployment.status.toLowerCase()}`}
                key={deployment.id}
              >
                <div className="deployment-status-marker" aria-hidden="true" />
                <div className="deployment-identity">
                  <strong>{deployment.clientName}</strong>
                  <span>{deployment.applicationName} · {deployment.serviceName ?? 'Application'}</span>
                </div>
                <div className="deployment-context">
                  <span className="environment-label">{deployment.environment}</span>
                  <code className="version-label">{deployment.version}</code>
                </div>
                <DeploymentStatusBadge status={deployment.status} />
                <time>{deployment.deployedAtLabel}</time>
              </article>
            ))
          )}
        </DCardContent>
      </DCard>
    </section>
  );
}

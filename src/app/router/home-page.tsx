import { DEmptyState } from '@digvation/ui';
import { Navigate } from 'react-router';
import { usePermissions } from '../../features/auth/use-permissions';
import { ContentSkeleton } from '../../shared/ui/content-skeleton';
import { firstVisibleRoute, NAVIGATION_GROUPS, visibleNavigation } from '../shell/navigation-items';

/** Sends the operator to the first area they may open. */
export function HomePage() {
  const { resolved, canAny } = usePermissions();
  if (!resolved) return <ContentSkeleton label="Loading your access" />;
  const target = firstVisibleRoute(visibleNavigation(NAVIGATION_GROUPS, canAny));
  if (target) return <Navigate to={target} replace />;
  return (
    <DEmptyState
      title="No areas available"
      description="Your account has no access to any Control Center area yet. Ask an administrator for a role."
    />
  );
}

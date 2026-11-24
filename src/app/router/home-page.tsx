import { DEmptyState } from '@digvation/ui';
import { Navigate } from 'react-router';
import { usePermissions } from '../../features/auth/use-permissions';
import { ContentSkeleton } from '../../shared/ui/content-skeleton';
import { firstVisibleRoute, NAVIGATION_GROUPS, visibleNavigation } from '../shell/navigation-items';

/** Sends the operator to the first area they may open. */
export function HomePage() {
  const { resolved, canAny } = usePermissions();
  if (!resolved) return <ContentSkeleton label="memuat akses Anda" />;
  const target = firstVisibleRoute(visibleNavigation(NAVIGATION_GROUPS, canAny));
  if (target) return <Navigate to={target} replace />;
  return (
    <DEmptyState
      title="Belum ada area yang bisa dibuka"
      description="Akun Anda belum punya akses ke area Control Center mana pun. Minta administrator memberikan role."
    />
  );
}

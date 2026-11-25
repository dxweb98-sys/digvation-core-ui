import { Lock } from 'lucide-react';
import { Navigate } from 'react-router';
import { useInvitationsCopy } from '../../features/access/invitations-copy';
import { usePermissions } from '../../features/auth/use-permissions';
import { AppAction } from '../../shared/ui/app-action';
import { ContentSkeleton } from '../../shared/ui/content-skeleton';
import { Page, PageHeader } from '../../shared/ui/page';
import { StateBlock } from '../../shared/ui/state-block';
import { firstVisibleRoute, NAVIGATION_GROUPS, visibleNavigation } from '../shell/navigation-items';

/** Sends the operator to the first area they may open; without one, the no-role card (05-invitations.html, N01). */
export function HomePage() {
  const copy = useInvitationsCopy();
  const { resolved, canAny, refetch, refetching } = usePermissions();
  if (!resolved) return <ContentSkeleton label="memuat akses Anda" />;
  const target = firstVisibleRoute(visibleNavigation(NAVIGATION_GROUPS, canAny));
  if (target) return <Navigate to={target} replace />;
  return (
    <Page>
      <PageHeader title={copy.homeTitle} />
      <section className="app-state-card">
        <StateBlock
          icon={<Lock size={20} aria-hidden="true" />}
          title={copy.home.title}
          body={copy.home.body}
          action={
            <AppAction tone="secondary" loading={refetching} onClick={() => void refetch()}>
              {copy.home.reload}
            </AppAction>
          }
        />
      </section>
    </Page>
  );
}

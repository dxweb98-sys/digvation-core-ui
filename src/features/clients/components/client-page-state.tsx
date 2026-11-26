import type { UseQueryResult } from '@tanstack/react-query';
import { AlertCircle, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../shared/api/api-error';
import { AppAction } from '../../../shared/ui/app-action';
import { ContentSkeleton } from '../../../shared/ui/content-skeleton';
import { Page } from '../../../shared/ui/page';
import { StateBlock } from '../../../shared/ui/state-block';
import { clientPaths } from '../client-paths';
import { useClientsCopy } from '../clients-copy';

type Pair = [string, string];

/** Loading, not found and load-failed for a client, business or brand page. */
export function ClientPageState({
  query,
  notFound,
  failed,
}: {
  query: Pick<UseQueryResult<unknown>, 'isPending' | 'isError' | 'error' | 'isFetching' | 'refetch'>;
  notFound?: Pair;
  failed?: Pair;
}) {
  const copy = useClientsCopy();
  const navigate = useNavigate();
  if (query.isPending) return <ContentSkeleton label={copy.title} />;

  const missing = !query.isError || (isApiError(query.error) && query.error.status === 404);
  const [title, body] = missing ? (notFound ?? copy.notFound) : (failed ?? copy.detailFailed);
  return (
    <Page>
      <section className="app-state-card" aria-label={title}>
        <StateBlock
          danger={!missing}
          icon={missing ? <SearchX size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}
          title={title}
          body={body}
          action={
            missing ? (
              <AppAction tone="secondary" onClick={() => navigate(clientPaths.list)}>
                {copy.backToClients}
              </AppAction>
            ) : (
              <AppAction tone="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
                {copy.retry}
              </AppAction>
            )
          }
        />
      </section>
    </Page>
  );
}

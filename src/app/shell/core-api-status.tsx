import { DBadge } from '@digvation/ui';
import { useQuery } from '@tanstack/react-query';
import { applicationConfig } from '../../shared/config/application-config';

const CHECK_INTERVAL_MS = 30_000;

async function isCoreApiReachable() {
  try {
    const response = await fetch(`${applicationConfig.coreApiUrl}/health/live`, {
      credentials: 'omit',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Reports whether the CORE API answers. It says nothing about any one page's data. */
export function CoreApiStatus() {
  const reachability = useQuery({
    queryKey: ['core-api-reachability'],
    queryFn: isCoreApiReachable,
    refetchInterval: CHECK_INTERVAL_MS,
    retry: false,
  });

  if (reachability.isPending) return <DBadge variant="secondary">Checking</DBadge>;
  return reachability.data ? (
    <DBadge variant="success" dot>
      Reachable
    </DBadge>
  ) : (
    <DBadge variant="danger" dot>
      Unreachable
    </DBadge>
  );
}

import { DConnectionError, DLoadingIndicator } from '@digvation/ui';
import { useQuery } from '@tanstack/react-query';
import { coreApiRequest } from '../../../shared/http/core-api-client';
import { NotConnected } from '../../../shared/ui/not-connected';

interface CoreListTotal {
  pagination: { total: number };
}

async function fetchTotal(path: string) {
  const response = await coreApiRequest<CoreListTotal>(`${path}?page=1&limit=1`);
  return response.pagination.total;
}

async function fetchCounts() {
  const [clients, installations] = await Promise.all([fetchTotal('/clients'), fetchTotal('/installations')]);
  return { clients, installations };
}

const SECTIONS = [
  ['Requires attention', 'Alerts that need an operator will appear here.'],
  ['Resource trend', 'CPU, memory and disk trends for each server will appear here.'],
  ['Recent activity', 'Recent deployments and service events will appear here.'],
  ['Managed infrastructure', 'Managed servers and their status will appear here.'],
  ['Application health', 'The health and running version of each client application will appear here.'],
] as const;

export function CoreDashboard() {
  const counts = useQuery({ queryKey: ['dashboard', 'core-counts'], queryFn: fetchCounts });

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Dashboard</h1>
        </div>
      </div>
      {counts.isPending ? <DLoadingIndicator label="Loading counts" /> : null}
      {counts.isError ? (
        <DConnectionError
          title="Counts unavailable"
          message="Client and installation counts could not be loaded."
          detail={counts.error.message}
          onRetry={() => void counts.refetch()}
        />
      ) : null}
      {counts.data ? (
        <dl className="core-dashboard-counts">
          <div>
            <dt>Clients</dt>
            <dd>{counts.data.clients}</dd>
          </div>
          <div>
            <dt>Installations</dt>
            <dd>{counts.data.installations}</dd>
          </div>
        </dl>
      ) : null}
      <div className="core-dashboard-sections">
        {SECTIONS.map(([heading, description]) => (
          <NotConnected description={description} heading={heading} key={heading} />
        ))}
      </div>
    </div>
  );
}

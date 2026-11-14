import { DDataTable, DEmptyState } from '@digvation/ui';
import { useNavigate } from 'react-router';
import { QueryState, Section } from '../../../shared/ui/page';
import type { ClientDetail } from '../../clients/clients-api';
import { useContracts } from '../contracts-queries';
import { CONTRACT_COLUMNS } from './contracts-table';

export function ClientContractsTab({ client }: { client: ClientDetail }) {
  const navigate = useNavigate();
  const contracts = useContracts({ client_id: client.id, limit: 100, page: 1 });
  return (
    <Section title="Contracts">
      <QueryState query={contracts} label="contracts">
        {(page) => (
          <DDataTable
            columns={CONTRACT_COLUMNS}
            data={page.items}
            rowKey="id"
            onRowClick={(contract) => navigate(`/contracts/${contract.id}`)}
            emptyMessage={<DEmptyState title="No contracts" description="Create a contract from one of the client's services." />}
          />
        )}
      </QueryState>
    </Section>
  );
}

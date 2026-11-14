import { DDataTable, DEmptyState, DStatusFilter } from '@digvation/ui';
import { useNavigate } from 'react-router';
import { AppDateInput } from '../../../shared/ui/form-fields';
import { Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { CONTRACT_COLUMNS, CONTRACT_STATUS_OPTIONS } from '../components/contracts-table';
import { useContracts } from '../contracts-queries';

export function ContractListPage() {
  const navigate = useNavigate();
  const list = useListState();
  const contracts = useContracts(list.query);

  return (
    <Page>
      <PageHeader
        title="Contracts"
        description="The commercial agreement of each client service: terms, agreed prices and renewals. Create a contract from the service page."
      />
      <QueryState query={contracts} label="contracts">
        {(page) => (
          <DDataTable
            columns={CONTRACT_COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search client, brand, product, or reference"
            {...list.tableProps}
            filters={
              <div className="app-page-actions">
                <DStatusFilter
                  label="Status"
                  allLabel="All statuses"
                  options={CONTRACT_STATUS_OPTIONS}
                  value={String(list.state.filters.status ?? 'ALL')}
                  onChange={(status) => list.setFilter('status', status)}
                />
                <AppDateInput
                  label="Ends before"
                  optional
                  clearable
                  value={String(list.state.filters.ends_before ?? '')}
                  onChange={(date) => list.setFilter('ends_before', date || undefined)}
                  onClear={() => list.setFilter('ends_before', undefined)}
                />
              </div>
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(contract) => navigate(`/contracts/${contract.id}`)}
            emptyMessage={<DEmptyState title="No contracts found" description="Try another search or filter." />}
          />
        )}
      </QueryState>
    </Page>
  );
}

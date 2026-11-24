import { DDataTable, DStatusFilter } from '@digvation/ui';
import { useNavigate } from 'react-router';
import { AppDateInput } from '../../../shared/ui/form-fields';
import { Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { CONTRACT_COLUMNS, CONTRACT_STATUS_OPTIONS } from '../components/contracts-table';
import { useContracts } from '../contracts-queries';

export function ContractListPage() { const navigate = useNavigate();
  const list = useListState();
  const contracts = useContracts(list.query);

  return (
    <Page>
      <PageHeader
        title="Contracts"
        description="Perjanjian komersial tiap service client: term, harga yang disepakati, dan perpanjangan. Buat contract dari halaman service."
      />
      <QueryState query={contracts} label="contracts">
        {(page) => (
          <DDataTable
            columns={CONTRACT_COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Cari client, brand, product, atau referensi"
            {...list.tableProps}
            filters={ <div className="app-page-actions">
                <DStatusFilter
                  label="Status"
                  allLabel="Semua status"
                  options={CONTRACT_STATUS_OPTIONS}
                  value={String(list.state.filters.status ?? 'ALL')}
                  onChange={(status) => list.setFilter('status', status)}
                />
                <AppDateInput
                  label="Berakhir sebelum"
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
            emptyMessage="Contract tidak ditemukan. Coba kata lain atau filter lain."
          />
        )}
      </QueryState>
    </Page>
  );
}

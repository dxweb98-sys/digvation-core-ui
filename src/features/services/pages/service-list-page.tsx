import { DDataTable, DStatusFilter } from '@digvation/ui';
import { useNavigate } from 'react-router';
import { Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { SERVICE_COLUMNS, SERVICE_STATUS_OPTIONS } from '../components/services-table';
import { useAllServices } from '../services-queries';

export function ServiceListPage() { const navigate = useNavigate();
  const list = useListState();
  const services = useAllServices(list.query);

  return (
    <Page>
      <PageHeader
        title="Services"
        description="Semua product yang di-provision untuk brand client. Buat service baru dari halaman client."
      />
      <QueryState query={services} label="services">
        {(page) => (
          <DDataTable
            columns={SERVICE_COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Cari client, brand, atau product"
            {...list.tableProps}
            filters={ <DStatusFilter
                label="Status"
                allLabel="Semua status"
                options={SERVICE_STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(service) => navigate(`/clients/${service.client_id}/services/${service.id}`)}
            emptyMessage="Service tidak ditemukan. Coba kata lain atau status lain."
          />
        )}
      </QueryState>
    </Page>
  );
}

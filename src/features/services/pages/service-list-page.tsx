import { DDataTable, DEmptyState, DStatusFilter } from '@digvation/ui';
import { useNavigate } from 'react-router';
import { Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { SERVICE_COLUMNS, SERVICE_STATUS_OPTIONS } from '../components/services-table';
import { useAllServices } from '../services-queries';

export function ServiceListPage() {
  const navigate = useNavigate();
  const list = useListState();
  const services = useAllServices(list.query);

  return (
    <Page>
      <PageHeader
        title="Services"
        description="Every product provisioned for a client brand. Provision new services from the client page."
      />
      <QueryState query={services} label="services">
        {(page) => (
          <DDataTable
            columns={SERVICE_COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search client, brand, or product"
            {...list.tableProps}
            filters={
              <DStatusFilter
                label="Status"
                allLabel="All statuses"
                options={SERVICE_STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(service) => navigate(`/clients/${service.client_id}/services/${service.id}`)}
            emptyMessage={<DEmptyState title="No services found" description="Try another search or status." />}
          />
        )}
      </QueryState>
    </Page>
  );
}

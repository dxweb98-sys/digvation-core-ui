import { DDataTable, DStatusFilter } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AppAction } from '../../../shared/ui/app-action';
import { Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { useInvoices } from '../billing-queries';
import { INVOICE_COLUMNS, INVOICE_STATUS_OPTIONS } from '../components/invoice-columns';
import { NewDraftDialog } from '../components/new-draft-dialog';

export function InvoiceListPage() { const navigate = useNavigate();
  const list = useListState();
  const invoices = useInvoices(list.query);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);

  return (
    <Page>
      <PageHeader
        title="Invoice"
        description="Draf dibuat sebelum setiap periode billing. Tinjau, terbitkan, dan kirim invoice di sini."
        actions={ can(PERMISSIONS.BILLING_MANAGE) && can(PERMISSIONS.CLIENTS_READ) ? (
            <AppAction icon={Plus} tone="secondary" onClick={() => setCreating(true)}>
              Draf baru
            </AppAction>
          ) : null
        }
      />
      <QueryState query={invoices} label="invoices">
        {(page) => (
          <DDataTable
            columns={INVOICE_COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Cari nomor, client, atau brand"
            {...list.tableProps}
            filters={ <DStatusFilter
                label="Status"
                allLabel="Semua status"
                options={INVOICE_STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
            emptyMessage="Invoice tidak ditemukan. Coba kata lain atau status lain."
          />
        )}
      </QueryState>
      <NewDraftDialog open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}

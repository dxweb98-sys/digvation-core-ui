import { DDataTable, DEmptyState } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { ConfirmDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { QueryState, Section } from '../../../shared/ui/page';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import type { ClientDetail } from '../../clients/clients-api';
import { billingApi, type SourceExclusion } from '../billing-api';
import { billingKeys, useClientBilling, useExclusions, useInvoices } from '../billing-queries';
import { INVOICE_COLUMNS } from './invoice-columns';
import { NewDraftDialog } from './new-draft-dialog';

export function ClientBillingTab({ client }: { client: ClientDetail }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const billing = useClientBilling(client.id);
  const invoices = useInvoices({ client_id: client.id, limit: 50, page: 1 });
  const exclusions = useExclusions(undefined, true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<SourceExclusion | null>(null);
  const restore = useApiMutation(
    (input: { id: string; reason: string }) => billingApi.restoreExclusion(input.id, input.reason),
    { success: 'The item will be billed again', invalidate: [billingKeys.all], toastErrors: false },
  );
  const brandIds = new Set(client.brands.map((brand) => brand.id));
  const brandName = new Map(client.brands.map((brand) => [brand.id, brand.name]));
  const excluded = (exclusions.data ?? []).filter((item) => brandIds.has(item.brand_id) && !item.restored_at);

  return (
    <div className="app-page">
      <Section title="Balance">
        <QueryState query={billing} label="balance">
          {(data) =>
            data.outstanding.length + data.credit.length === 0 ? (
              <p className="form-dialog-message">Nothing outstanding and no client credit.</p>
            ) : (
              <div className="app-summary">
                {data.outstanding.map((item) => (
                  <div className="app-summary-item" key={`o-${item.currency}`}>
                    <span>Outstanding {item.currency}</span>
                    <strong>{formatMoney(item.amount, item.currency)}</strong>
                  </div>
                ))}
                {data.credit.map((item) => (
                  <div className="app-summary-item" key={`c-${item.currency}`}>
                    <span>Client credit {item.currency}</span>
                    <strong>{formatMoney(item.amount, item.currency)}</strong>
                  </div>
                ))}
              </div>
            )
          }
        </QueryState>
      </Section>
      <Section
        title="Invoices"
        actions={
          can(PERMISSIONS.BILLING_MANAGE) && client.status !== 'ARCHIVED' ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
              New draft
            </AppAction>
          ) : null
        }
      >
        <QueryState query={invoices} label="invoices">
          {(page) => (
            <DDataTable
              columns={INVOICE_COLUMNS}
              data={page.items}
              rowKey="id"
              onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
              emptyMessage={<DEmptyState title="No invoices" description="Drafts appear before each billing period." />}
            />
          )}
        </QueryState>
      </Section>
      {excluded.length > 0 ? (
        <Section title="Excluded from billing">
          <DDataTable
            columns={[
              { key: 'description', label: 'Item' },
              { key: 'brand_id', label: 'Brand', render: (item) => brandName.get(item.brand_id) ?? '—' },
              { key: 'reason', label: 'Reason' },
              { key: 'created_at', label: 'Excluded', render: (item) => formatInstant(item.created_at) },
            ]}
            data={excluded}
            rowKey="id"
            actions={can(PERMISSIONS.BILLING_MANAGE) ? [{ label: 'Bill again', onClick: setRestoring }] : undefined}
          />
        </Section>
      ) : null}
      <NewDraftDialog open={creating} clientId={client.id} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={restoring !== null}
        title="Bill again"
        message={`${restoring?.description ?? ''} goes back into the next generated draft.`}
        confirmLabel="Bill again"
        tone="primary"
        reason={{}}
        onConfirm={(values) => restore.mutateAsync({ id: restoring!.id, reason: read.text(values, 'reason') })}
        onClose={() => setRestoring(null)}
      />
    </div>
  );
}

import { DDataTable, DEmptyState, useToast, type TableColumn } from '@digvation/ui';
import { Link } from 'react-router';
import { errorReference, friendlyErrorMessage } from '../../../shared/api/error-messages';
import { documentFileName, saveFile } from '../../../shared/api/save-file';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { Code, Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, type CreditNote } from '../billing-api';
import { billingKeys, useCreditNotes } from '../billing-queries';

const COLUMNS: TableColumn<CreditNote>[] = [
  { key: 'number', label: 'Credit note', render: (note) => <Identity primary={<Code>{note.number}</Code>} secondary={note.description} /> },
  {
    key: 'invoice',
    label: 'Invoice',
    render: (note) => <Link to={`/invoices/${note.invoice.id}`}>{note.invoice.number ?? 'Invoice'}</Link>,
  },
  { key: 'issue_date', label: 'Issued', render: (note) => formatBusinessDate(note.issue_date) },
  { key: 'amount', label: 'Amount', align: 'right', render: (note) => <span className="app-amount">{formatMoney(note.amount, note.currency)}</span> },
  { key: 'reason', label: 'Reason' },
  {
    key: 'deliveries',
    label: 'Sent',
    render: (note) => (note.deliveries.some((delivery) => delivery.status === 'SENT') ? 'Yes' : 'No'),
  },
];

export function CreditNoteListPage() {
  const list = useListState();
  const notes = useCreditNotes(list.query);
  const { can } = usePermissions();
  const { showToast } = useToast();
  const send = useApiMutation((note: CreditNote) => billingApi.sendCreditNote(note.id), {
    success: 'Credit note sent',
    invalidate: [billingKeys.all],
  });

  async function download(note: CreditNote) {
    try {
      saveFile(await billingApi.creditNotePdf(note.id), documentFileName(note.number, note.id));
    } catch (error) {
      showToast({ title: friendlyErrorMessage(error), description: errorReference(error), variant: 'danger' });
    }
  }

  return (
    <Page>
      <PageHeader title="Credit notes" description="Reductions of issued invoices. Issue a credit note from its invoice." />
      <QueryState query={notes} label="credit notes">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search number or invoice"
            {...list.tableProps}
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            actions={[
              { label: 'Download PDF', onClick: (note) => void download(note) },
              ...(can(PERMISSIONS.BILLING_MANAGE) ? [{ label: 'Send', onClick: (note: CreditNote) => send.mutate(note) }] : []),
            ]}
            emptyMessage={<DEmptyState title="No credit notes" description="Credit notes appear here once issued." />}
          />
        )}
      </QueryState>
    </Page>
  );
}

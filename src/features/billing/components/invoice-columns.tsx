import { DBadge, type TableColumn } from '@digvation/ui';
import { formatBusinessDate } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { labelFor } from '../../../shared/labels/labels';
import { Identity } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Invoice } from '../billing-api';

export const INVOICE_STATUS_OPTIONS = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'].map((value) => ({
  value,
  label: labelFor(value),
}));

export function InvoiceStatus({ invoice }: { invoice: Pick<Invoice, 'status' | 'overdue'> }) {
  return (
    <span className="app-page-actions">
      <StatusBadge status={invoice.status} />
      {invoice.overdue ? <DBadge variant="danger">Overdue</DBadge> : null}
    </span>
  );
}

export const INVOICE_COLUMNS: TableColumn<Invoice>[] = [
  {
    key: 'number',
    label: 'Invoice',
    render: (invoice) => (
      <RecordButton>
        <Identity primary={invoice.number ?? 'Draft'} secondary={`${invoice.client.name} · ${invoice.brand.name}`} />
      </RecordButton>
    ),
  },
  { key: 'status', label: 'Status', render: (invoice) => <InvoiceStatus invoice={invoice} /> },
  {
    key: 'period_start',
    label: 'Period',
    render: (invoice) =>
      invoice.period_start ? `${formatBusinessDate(invoice.period_start)} – ${formatBusinessDate(invoice.period_end)}` : '—',
  },
  { key: 'issue_date', label: 'Issued', render: (invoice) => formatBusinessDate(invoice.issue_date) },
  { key: 'due_date', label: 'Due', render: (invoice) => formatBusinessDate(invoice.due_date) },
  {
    key: 'total',
    label: 'Total',
    align: 'right',
    render: (invoice) => <span className="app-amount">{formatMoney(invoice.total, invoice.currency)}</span>,
  },
  {
    key: 'balance',
    label: 'Balance',
    align: 'right',
    render: (invoice) => <span className="app-amount">{formatMoney(invoice.balance, invoice.currency)}</span>,
  },
];

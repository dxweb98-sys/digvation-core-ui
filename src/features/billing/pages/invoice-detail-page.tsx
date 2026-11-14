import { DAlert, DDataTable, DEmptyState, useToast, type TableColumn } from '@digvation/ui';
import { Download, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorReference, friendlyErrorMessage } from '../../../shared/api/error-messages';
import { documentFileName, saveFile } from '../../../shared/api/save-file';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { formatMoney, rupiahToMinor } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, isOpenInvoice, type InvoiceDetail, type InvoiceLine } from '../billing-api';
import { billingKeys, useInvoice } from '../billing-queries';
import { InvoiceStatus } from '../components/invoice-columns';

const LINE_COLUMNS: TableColumn<InvoiceLine>[] = [
  {
    key: 'description',
    label: 'Item',
    render: (line) => (
      <Identity
        primary={line.description}
        secondary={
          line.period_start
            ? `${labelFor(line.kind)} · ${formatBusinessDate(line.period_start)} – ${formatBusinessDate(line.period_end)}`
            : labelFor(line.kind)
        }
      />
    ),
  },
  { key: 'quantity', label: 'Qty', align: 'right' },
  { key: 'unit_amount', label: 'Unit price', align: 'right', render: (line) => <span className="app-amount">{formatMoney(line.unit_amount)}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (line) => <span className="app-amount">{formatMoney(line.amount)}</span> },
];

function Totals({ invoice }: { invoice: InvoiceDetail }) {
  const items = [
    ['Subtotal', invoice.subtotal],
    [invoice.tax_name ? `${invoice.tax_name} ${(invoice.tax_rate_basis_points ?? 0) / 100}%` : 'Tax', invoice.tax_amount],
    ['Total', invoice.total],
    ['Paid', invoice.amount_paid],
    ['Credited', invoice.credited_amount],
    ['Balance', invoice.balance],
  ] as const;
  return (
    <div className="app-summary">
      {items.map(([label, amount]) => (
        <div className="app-summary-item" key={label}>
          <span>{label}</span>
          <strong>{formatMoney(amount, invoice.currency)}</strong>
        </div>
      ))}
    </div>
  );
}

function InvoiceView({ invoice }: { invoice: InvoiceDetail }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.BILLING_MANAGE);
  const draft = invoice.status === 'DRAFT';
  const [addingLine, setAddingLine] = useState(false);
  const [removing, setRemoving] = useState<InvoiceLine | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [crediting, setCrediting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const invalidate = [billingKeys.all];

  const addLine = useApiMutation(
    (values: Parameters<typeof read.text>[0]) =>
      billingApi.addLine(invoice.id, {
        description: read.text(values, 'description'),
        quantity: read.integer(values, 'quantity') ?? 1,
        unit_amount: rupiahToMinor(read.rupiah(values, 'unit_amount') ?? 0),
        period_start: read.omit(values, 'period_start'),
        period_end: read.omit(values, 'period_end'),
      }),
    { success: 'Item added', invalidate, toastErrors: false },
  );
  const removeLine = useApiMutation(
    (input: { lineId: string; reason: string }) => billingApi.removeLine(invoice.id, input.lineId, input.reason),
    { success: 'Line removed', invalidate, toastErrors: false },
  );
  const issue = useApiMutation((reason: string | undefined) => billingApi.issue(invoice.id, reason), {
    success: (issued) => `Invoice ${issued.number ?? ''} issued`,
    invalidate,
    toastErrors: false,
  });
  const send = useApiMutation(() => billingApi.send(invoice.id), {
    success: (delivery) => `Sent to ${delivery.recipients.join(', ')}`,
    invalidate,
  });
  const voidInvoice = useApiMutation((reason: string) => billingApi.void(invoice.id, reason), {
    success: 'Invoice voided',
    invalidate,
    toastErrors: false,
  });
  const remove = useApiMutation(() => billingApi.deleteDraft(invoice.id), {
    success: 'Draft deleted',
    invalidate,
    toastErrors: false,
    onSuccess: () => navigate('/invoices'),
  });
  const credit = useApiMutation(
    (values: Parameters<typeof read.text>[0]) =>
      billingApi.createCreditNote(invoice.id, {
        amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
        description: read.text(values, 'description'),
        reason: read.text(values, 'reason'),
      }),
    { success: (note) => `Credit note ${note.number} issued`, invalidate, toastErrors: false },
  );

  async function downloadPdf() {
    setDownloading(true);
    try {
      saveFile(await billingApi.invoicePdf(invoice.id), documentFileName(invoice.number, invoice.id));
    } catch (error) {
      showToast({ title: friendlyErrorMessage(error), description: errorReference(error), variant: 'danger' });
    } finally {
      setDownloading(false);
    }
  }

  const open = isOpenInvoice(invoice.status);
  const contacts = (invoice.snapshot as { billing_contacts?: { email?: string }[] } | null)?.billing_contacts;

  return (
    <Page>
      <Link className="app-back-link" to="/invoices">
        ← Invoices
      </Link>
      <PageHeader
        title={invoice.number ?? 'Draft invoice'}
        meta={
          <>
            <Link to={`/clients/${invoice.client.id}?tab=billing`}>{invoice.client.name}</Link>
            <Code>{invoice.brand.code}</Code>
            <InvoiceStatus invoice={invoice} />
          </>
        }
        actions={
          <>
            {!draft && invoice.status !== 'VOID' ? (
              <AppAction icon={Download} tone="secondary" loading={downloading} onClick={() => void downloadPdf()}>
                Download PDF
              </AppAction>
            ) : null}
            {canManage && open ? (
              <>
                <AppAction tone="secondary" onClick={() => setCrediting(true)}>
                  Credit note
                </AppAction>
                <AppAction tone="danger-subtle" onClick={() => setVoiding(true)}>
                  Void
                </AppAction>
                <AppAction icon={Send} loading={send.isPending} onClick={() => send.mutate()}>
                  Send
                </AppAction>
              </>
            ) : null}
            {canManage && draft ? (
              <>
                {invoice.lines.length === 0 ? (
                  <AppAction tone="danger-subtle" onClick={() => setDeleting(true)}>
                    Delete draft
                  </AppAction>
                ) : null}
                <AppAction onClick={() => setIssuing(true)} disabled={invoice.lines.length === 0}>
                  Issue
                </AppAction>
              </>
            ) : null}
          </>
        }
      />
      {invoice.status === 'VOID' ? <DAlert variant="danger">Voided on {formatInstant(invoice.voided_at)}.</DAlert> : null}
      <Section title="Summary">
        <Totals invoice={invoice} />
        <p className="form-dialog-message">
          {invoice.issue_date ? `Issued ${formatBusinessDate(invoice.issue_date)}, due ${formatBusinessDate(invoice.due_date)}.` : 'Not issued yet.'}
          {contacts?.length ? ` Billing contacts: ${contacts.map((contact) => contact.email).filter(Boolean).join(', ')}.` : ''}
        </p>
      </Section>
      <Section
        title="Lines"
        actions={
          canManage && draft ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingLine(true)}>
              Add item
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={LINE_COLUMNS}
          data={invoice.lines}
          rowKey="id"
          actions={canManage && draft ? [{ label: 'Remove', variant: 'danger', onClick: setRemoving }] : undefined}
          emptyMessage={<DEmptyState title="No lines" description="Add an item to bill." />}
        />
      </Section>
      {invoice.allocations.length > 0 ? (
        <Section title="Payments allocated">
          <DDataTable
            columns={[
              { key: 'payment_id', label: 'Payment', render: (item) => <Link to={`/payments/${item.payment_id}`}>Open payment</Link> },
              { key: 'amount', label: 'Amount', align: 'right', render: (item) => formatMoney(item.amount, invoice.currency) },
              { key: 'created_at', label: 'Allocated', render: (item) => formatInstant(item.created_at) },
            ]}
            data={invoice.allocations}
            rowKey="id"
          />
        </Section>
      ) : null}
      {invoice.credit_notes.length > 0 ? (
        <Section title="Credit notes">
          <DDataTable
            columns={[
              { key: 'number', label: 'Number', render: (note) => <Code>{note.number}</Code> },
              { key: 'amount', label: 'Amount', align: 'right', render: (note) => formatMoney(note.amount, invoice.currency) },
              { key: 'issue_date', label: 'Issued', render: (note) => formatBusinessDate(note.issue_date) },
            ]}
            data={invoice.credit_notes}
            rowKey="id"
          />
        </Section>
      ) : null}
      {invoice.deliveries.length > 0 ? (
        <Section title="Send history">
          <DDataTable
            columns={[
              { key: 'created_at', label: 'When', render: (item) => formatInstant(item.created_at) },
              { key: 'status', label: 'Result', render: (item) => <StatusBadge status={item.status} /> },
              { key: 'recipients', label: 'To', render: (item) => item.recipients.join(', ') },
              { key: 'error_message', label: 'Error', render: (item) => item.error_message ?? '—' },
            ]}
            data={invoice.deliveries}
            rowKey="id"
          />
        </Section>
      ) : null}

      <FormDialog
        open={addingLine}
        title="Add item"
        description="A negative unit price is a discount."
        fields={[
          { name: 'description', label: 'Description', required: true, maxLength: 300, placeholder: 'Pelatihan staf (2 sesi)' },
          { name: 'quantity', label: 'Quantity', kind: 'integer', required: true, half: true, min: 1, max: 100000 },
          { name: 'unit_amount', label: 'Unit price (Rp)', kind: 'rupiah', required: true, half: true, allowNegative: true },
          { name: 'period_start', label: 'Period from', kind: 'date', half: true },
          {
            name: 'period_end',
            label: 'Period to',
            kind: 'date',
            half: true,
            validate: (value, values) =>
              Boolean(value) !== Boolean(values.period_start) ? 'Give both period dates, or neither.' : undefined,
          },
        ]}
        initialValues={{ quantity: '1' }}
        submitLabel="Add item"
        onSubmit={(values) => addLine.mutateAsync(values)}
        onClose={() => setAddingLine(false)}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Remove line"
        message={
          removing?.source_key
            ? `${removing.description} is excluded from billing until restored. CORE keeps the exclusion with your reason.`
            : `${removing?.description ?? ''} is removed from the draft.`
        }
        confirmLabel="Remove"
        reason={{}}
        onConfirm={(values) => removeLine.mutateAsync({ lineId: removing!.id, reason: read.text(values, 'reason') })}
        onClose={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={issuing}
        title="Issue invoice"
        message={`CORE assigns the number, applies tax and freezes the invoice at ${formatMoney(invoice.subtotal, invoice.currency)} before tax. An issued invoice cannot be edited; it can only be credited or voided.`}
        confirmLabel="Issue"
        tone="primary"
        reason={{ label: 'Note', required: false }}
        onConfirm={(values) => issue.mutateAsync(read.omit(values, 'reason'))}
        onClose={() => setIssuing(false)}
      />
      <ConfirmDialog
        open={voiding}
        title="Void invoice"
        message="A voided invoice no longer counts. CORE refuses while payments are allocated to it or credit notes exist."
        confirmLabel="Void"
        reason={{}}
        onConfirm={(values) => voidInvoice.mutateAsync(read.text(values, 'reason'))}
        onClose={() => setVoiding(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete draft"
        message="The empty draft is deleted."
        confirmLabel="Delete"
        onConfirm={() => remove.mutateAsync(undefined)}
        onClose={() => setDeleting(false)}
      />
      <FormDialog
        open={crediting}
        title="Issue credit note"
        description={`Reduces what the client owes. At most the balance, ${formatMoney(invoice.balance, invoice.currency)}, tax included.`}
        fields={[
          { name: 'amount', label: 'Amount credited (Rp)', kind: 'rupiah', required: true, min: 1 },
          { name: 'description', label: 'Description', required: true, maxLength: 500, placeholder: 'Koreksi harga paket' },
          { name: 'reason', label: 'Reason', kind: 'textarea', required: true, maxLength: 500 },
        ]}
        submitLabel="Issue credit note"
        onSubmit={(values) => credit.mutateAsync(values)}
        onClose={() => setCrediting(false)}
      />
    </Page>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams();
  const invoice = useInvoice(invoiceId);
  return <QueryState query={invoice} label="invoice">{(data) => <InvoiceView invoice={data} />}</QueryState>;
}

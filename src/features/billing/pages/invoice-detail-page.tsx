import { DAlert, DDataTable, useToast, type TableColumn } from '@digvation/ui';
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
import { Code, Identity, Page, PageBreadcrumb, PageHeader, QueryState, Section, StatStrip } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, isOpenInvoice, type InvoiceDetail, type InvoiceLine } from '../billing-api';
import { billingKeys, useInvoice } from '../billing-queries';
import { InvoiceStatus } from '../components/invoice-columns';

const LINE_COLUMNS: TableColumn<InvoiceLine>[] = [
  { key: 'description',
    label: 'Item',
    render: (line) => (
      <Identity
        primary={line.description}
        secondary={ line.period_start
            ? `${labelFor(line.kind)} · ${formatBusinessDate(line.period_start)} – ${formatBusinessDate(line.period_end)}`
            : labelFor(line.kind)
        }
      />
    ) },
  { key: 'quantity', label: 'Qty', align: 'right' },
  { key: 'unit_amount', label: 'Harga satuan', align: 'right', render: (line) => <span className="app-amount">{formatMoney(line.unit_amount)}</span> },
  { key: 'amount', label: 'Jumlah', align: 'right', render: (line) => <span className="app-amount">{formatMoney(line.amount)}</span> },
];

function Totals({ invoice }: { invoice: InvoiceDetail }) { const items = [
    ['Subtotal', invoice.subtotal],
    [invoice.tax_name ? `${invoice.tax_name} ${(invoice.tax_rate_basis_points ?? 0) / 100}%` : 'Pajak', invoice.tax_amount],
    ['Total', invoice.total],
    ['Dibayar', invoice.amount_paid],
    ['Dikredit', invoice.credited_amount],
    ['Sisa', invoice.balance],
  ] as const;
  return (
    <StatStrip
      items={items.map(([label, amount]) => ({ label, value: formatMoney(amount, invoice.currency) }))}
    />
  );
}

function InvoiceView({ invoice }: { invoice: InvoiceDetail }) { const navigate = useNavigate();
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
      billingApi.addLine(invoice.id, { description: read.text(values, 'description'),
        quantity: read.integer(values, 'quantity') ?? 1,
        unit_amount: rupiahToMinor(read.rupiah(values, 'unit_amount') ?? 0),
        period_start: read.omit(values, 'period_start'),
        period_end: read.omit(values, 'period_end') }),
    { success: 'Item ditambahkan', invalidate, toastErrors: false },
  );
  const removeLine = useApiMutation(
    (input: { lineId: string; reason: string }) => billingApi.removeLine(invoice.id, input.lineId, input.reason),
    { success: 'Item dihapus', invalidate, toastErrors: false },
  );
  const issue = useApiMutation((reason: string | undefined) => billingApi.issue(invoice.id, reason), { success: (issued) => `Invoice ${issued.number ?? ''} diterbitkan`,
    invalidate,
    toastErrors: false });
  const send = useApiMutation(() => billingApi.send(invoice.id), { success: (delivery) => `Dikirim ke ${delivery.recipients.join(', ')}`,
    invalidate });
  const voidInvoice = useApiMutation((reason: string) => billingApi.void(invoice.id, reason), { success: 'Invoice dibatalkan',
    invalidate,
    toastErrors: false });
  const remove = useApiMutation(() => billingApi.deleteDraft(invoice.id), { success: 'Draf dihapus',
    invalidate,
    toastErrors: false,
    onSuccess: () => navigate('/invoices') });
  const credit = useApiMutation(
    (values: Parameters<typeof read.text>[0]) =>
      billingApi.createCreditNote(invoice.id, { amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
        description: read.text(values, 'description'),
        reason: read.text(values, 'reason') }),
    { success: (note) => `Credit note ${note.number} diterbitkan`, invalidate, toastErrors: false },
  );

  async function downloadPdf() { setDownloading(true);
    try { saveFile(await billingApi.invoicePdf(invoice.id), documentFileName(invoice.number, invoice.id));
    } catch (error) { showToast({ title: friendlyErrorMessage(error), description: errorReference(error), variant: 'danger' });
    } finally { setDownloading(false);
    }
  }

  const open = isOpenInvoice(invoice.status);
  const contacts = (invoice.snapshot as { billing_contacts?: { email?: string }[] } | null)?.billing_contacts;

  return (
    <Page>
      <PageBreadcrumb trail={[{ label: 'Invoice', to: '/invoices' }, { label: invoice.number ?? 'Draf invoice' }]} />
      <PageHeader
        title={invoice.number ?? 'Draf invoice'}
        meta={ <>
            <Link to={`/clients/${invoice.client.id}?tab=billing`}>{invoice.client.name}</Link>
            <Code>{invoice.brand.code}</Code>
            <InvoiceStatus invoice={invoice} />
          </>
        }
        actions={ <>
            {!draft && invoice.status !== 'VOID' ? (
              <AppAction icon={Download} tone="secondary" loading={downloading} onClick={() => void downloadPdf()}>
                Unduh PDF
              </AppAction>
            ) : null}
            {canManage && open ? (
              <>
                <AppAction tone="secondary" onClick={() => setCrediting(true)}>
                  Credit note
                </AppAction>
                <AppAction tone="danger-subtle" onClick={() => setVoiding(true)}>
                  Batalkan
                </AppAction>
                <AppAction icon={Send} loading={send.isPending} onClick={() => send.mutate()}>
                  Kirim
                </AppAction>
              </>
            ) : null}
            {canManage && draft ? (
              <>
                {invoice.lines.length === 0 ? (
                  <AppAction tone="danger-subtle" onClick={() => setDeleting(true)}>
                    Hapus draf
                  </AppAction>
                ) : null}
                <AppAction onClick={() => setIssuing(true)} disabled={invoice.lines.length === 0}>
                  Terbitkan
                </AppAction>
              </>
            ) : null}
          </>
        }
      />
      {invoice.status === 'VOID' ? <DAlert variant="danger">Dibatalkan pada {formatInstant(invoice.voided_at)}.</DAlert> : null}
      <Section title="Ringkasan">
        <Totals invoice={invoice} />
        <p className="form-dialog-message">
          {invoice.issue_date ? `Diterbitkan ${formatBusinessDate(invoice.issue_date)}, jatuh tempo ${formatBusinessDate(invoice.due_date)}.` : 'Belum diterbitkan.'}
          {contacts?.length ? ` Kontak penagihan: ${contacts.map((contact) => contact.email).filter(Boolean).join(', ')}.` : ''}
        </p>
      </Section>
      <Section
        title="Item"
        actions={ canManage && draft ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingLine(true)}>
              Tambah item
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={LINE_COLUMNS}
          data={invoice.lines}
          rowKey="id"
          actions={canManage && draft ? [{ label: 'Hapus', variant: 'danger', onClick: setRemoving }] : undefined}
          emptyMessage="Belum ada item. Tambahkan item untuk ditagih."
        />
      </Section>
      {invoice.allocations.length > 0 ? (
        <Section title="Payment dialokasikan">
          <DDataTable
            columns={[
              { key: 'payment_id', label: 'Payment', render: (item) => <Link to={`/payments/${item.payment_id}`}>Buka payment</Link> },
              { key: 'amount', label: 'Jumlah', align: 'right', render: (item) => formatMoney(item.amount, invoice.currency) },
              { key: 'created_at', label: 'Dialokasikan', render: (item) => formatInstant(item.created_at) },
            ]}
            data={invoice.allocations}
            rowKey="id"
          />
        </Section>
      ) : null}
      {invoice.credit_notes.length > 0 ? (
        <Section title="Credit note">
          <DDataTable
            columns={[
              { key: 'number', label: 'Nomor', render: (note) => <Code>{note.number}</Code> },
              { key: 'amount', label: 'Jumlah', align: 'right', render: (note) => formatMoney(note.amount, invoice.currency) },
              { key: 'issue_date', label: 'Terbit', render: (note) => formatBusinessDate(note.issue_date) },
            ]}
            data={invoice.credit_notes}
            rowKey="id"
          />
        </Section>
      ) : null}
      {invoice.deliveries.length > 0 ? (
        <Section title="Riwayat pengiriman">
          <DDataTable
            columns={[
              { key: 'created_at', label: 'Waktu', render: (item) => formatInstant(item.created_at) },
              { key: 'status', label: 'Hasil', render: (item) => <StatusBadge status={item.status} /> },
              { key: 'recipients', label: 'Kepada', render: (item) => item.recipients.join(', ') },
              { key: 'error_message', label: 'Kesalahan', render: (item) => item.error_message ?? '—' },
            ]}
            data={invoice.deliveries}
            rowKey="id"
          />
        </Section>
      ) : null}

      <FormDialog
        open={addingLine}
        title="Tambah item"
        description="Harga satuan negatif berlaku sebagai diskon."
        fields={[
          { name: 'description', label: 'Deskripsi', required: true, maxLength: 300, placeholder: 'Pelatihan staf (2 sesi)' },
          { name: 'quantity', label: 'Jumlah', kind: 'integer', required: true, half: true, min: 1, max: 100000 },
          { name: 'unit_amount', label: 'Harga satuan (Rp)', kind: 'rupiah', required: true, half: true, allowNegative: true },
          { name: 'period_start', label: 'Periode mulai', kind: 'date', half: true },
          { name: 'period_end',
            label: 'Periode sampai',
            kind: 'date',
            half: true,
            validate: (value, values) =>
              Boolean(value) !== Boolean(values.period_start) ? 'Isi kedua tanggal periode, atau keduanya kosong.' : undefined },
        ]}
        initialValues={{ quantity: '1' }}
        submitLabel="Tambah item"
        onSubmit={(values) => addLine.mutateAsync(values)}
        onClose={() => setAddingLine(false)}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Hapus item"
        message={ removing?.source_key
            ? `${removing.description} dikecualikan dari billing sampai dipulihkan. CORE menyimpan pengecualian beserta alasannya.`
            : `${removing?.description ?? ''} dihapus dari draf.`
        }
        confirmLabel="Hapus"
        reason={{}}
        onConfirm={(values) => removeLine.mutateAsync({ lineId: removing!.id, reason: read.text(values, 'reason') })}
        onClose={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={issuing}
        title="Terbitkan invoice"
        message={`CORE memberi nomor, menerapkan pajak, dan mengunci invoice di ${formatMoney(invoice.subtotal, invoice.currency)} sebelum pajak. Invoice yang sudah terbit tidak dapat diubah; hanya dapat dikredit atau dibatalkan.`}
        confirmLabel="Terbitkan"
        tone="primary"
        reason={{ label: 'Catatan', required: false }}
        onConfirm={(values) => issue.mutateAsync(read.omit(values, 'reason'))}
        onClose={() => setIssuing(false)}
      />
      <ConfirmDialog
        open={voiding}
        title="Batalkan invoice"
        message="Invoice yang dibatalkan tidak lagi dihitung. CORE menolak selama masih ada payment yang dialokasikan atau credit note pada invoice ini."
        confirmLabel="Batalkan"
        reason={{}}
        onConfirm={(values) => voidInvoice.mutateAsync(read.text(values, 'reason'))}
        onClose={() => setVoiding(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="Hapus draf"
        message="Draf kosong akan dihapus."
        confirmLabel="Hapus"
        onConfirm={() => remove.mutateAsync(undefined)}
        onClose={() => setDeleting(false)}
      />
      <FormDialog
        open={crediting}
        title="Terbitkan credit note"
        description={`Mengurangi tagihan client. Maksimal sebesar sisa, ${formatMoney(invoice.balance, invoice.currency)}, termasuk pajak.`}
        fields={[
          { name: 'amount', label: 'Jumlah kredit (Rp)', kind: 'rupiah', required: true, min: 1 },
          { name: 'description', label: 'Deskripsi', required: true, maxLength: 500, placeholder: 'Koreksi harga paket' },
          { name: 'reason', label: 'Alasan', kind: 'textarea', required: true, maxLength: 500 },
        ]}
        submitLabel="Terbitkan credit note"
        onSubmit={(values) => credit.mutateAsync(values)}
        onClose={() => setCrediting(false)}
      />
    </Page>
  );
}

export function InvoiceDetailPage() { const { invoiceId = '' } = useParams();
  const invoice = useInvoice(invoiceId);
  return <QueryState query={invoice} label="invoice">{(data) => <InvoiceView invoice={data} />}</QueryState>;
}

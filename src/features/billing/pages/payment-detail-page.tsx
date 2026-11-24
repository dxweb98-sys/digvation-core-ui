import { DAlert, DDataTable, useToast, type TableColumn } from '@digvation/ui';
import { Download, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { errorReference, friendlyErrorMessage } from '../../../shared/api/error-messages';
import { saveFile } from '../../../shared/api/save-file';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { formatMoney, minorToRupiah, rupiahToMinor } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, FieldGrid, Page, PageBreadcrumb, PageHeader, QueryState, Section, StatStrip } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, isOpenInvoice, type Payment, type PaymentAllocation } from '../billing-api';
import { billingKeys, useInvoices, usePayment } from '../billing-queries';
import { proofProblem } from '../payment-rules';

const proofExtension = (contentType: string | null) =>
  contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : 'jpg';

function PaymentView({ payment }: { payment: Payment }) { const { showToast } = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.PAYMENTS_MANAGE);
  const recorded = payment.status === 'RECORDED';
  const invoices = useInvoices({ client_id: payment.client.id, currency: payment.currency, limit: 100, page: 1 }, canManage && recorded);
  const [allocating, setAllocating] = useState(false);
  const [releasing, setReleasing] = useState<PaymentAllocation | null>(null);
  const [reversing, setReversing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const invalidate = [billingKeys.all];

  const allocate = useApiMutation(
    (input: { invoice_id: string; amount: string }) => billingApi.allocate(payment.id, input),
    { success: 'Payment dialokasikan', invalidate, toastErrors: false },
  );
  const release = useApiMutation(
    (input: { allocationId: string; reason: string }) => billingApi.release(payment.id, input.allocationId, input.reason),
    { success: 'Alokasi dilepas', invalidate, toastErrors: false },
  );
  const reverse = useApiMutation((reason: string) => billingApi.reverse(payment.id, reason), { success: 'Payment dibalik',
    invalidate,
    toastErrors: false });
  const upload = useApiMutation((file: File) => billingApi.uploadProof(payment.id, file), { success: 'Bukti transfer dilampirkan',
    invalidate,
    toastErrors: false });

  async function downloadProof() { try { saveFile(await billingApi.proof(payment.id), `payment-proof-${payment.id.slice(0, 8)}.${proofExtension(payment.proof_content_type)}`);
    } catch (error) { showToast({ title: friendlyErrorMessage(error), description: errorReference(error), variant: 'danger' });
    }
  }

  const openInvoices = (invoices.data?.items ?? []).filter((invoice) => isOpenInvoice(invoice.status));
  const columns: TableColumn<PaymentAllocation>[] = [
    { key: 'invoice',
      label: 'Invoice',
      render: (item) => <Link to={`/invoices/${item.invoice.id}`}>{item.invoice.number ?? 'Invoice'}</Link> },
    { key: 'amount', label: 'Jumlah', align: 'right', render: (item) => <span className="app-amount">{formatMoney(item.amount, payment.currency)}</span> },
    { key: 'created_at', label: 'Dialokasikan', render: (item) => formatInstant(item.created_at) },
    { key: 'released_at', label: 'Dilepas', render: (item) => (item.released_at ? formatInstant(item.released_at) : '—') },
  ];

  return (
    <Page>
      <PageBreadcrumb trail={[{ label: 'Payments', to: '/payments' }, { label: formatMoney(payment.amount, payment.currency) }]} />
      <PageHeader
        title={`${formatMoney(payment.amount, payment.currency)} dari ${payment.client.name}`}
        meta={ <>
            <Code>{payment.client.code}</Code>
            <StatusBadge status={payment.status} />
          </>
        }
        actions={ <>
            {payment.has_proof ? (
              <AppAction icon={Download} tone="secondary" onClick={() => void downloadProof()}>
                Unduh bukti
              </AppAction>
            ) : null}
            {canManage && recorded && !payment.has_proof ? (
              <AppAction icon={Upload} tone="secondary" onClick={() => setUploading(true)}>
                Lampirkan bukti
              </AppAction>
            ) : null}
            {canManage && recorded ? (
              <AppAction tone="danger-subtle" onClick={() => setReversing(true)}>
                Balikkan
              </AppAction>
            ) : null}
          </>
        }
      />
      {payment.status === 'REVERSED' ? (
        <DAlert variant="danger">Dibalik pada {formatInstant(payment.reversed_at)}. Semua alokasinya telah dilepas.</DAlert>
      ) : null}
      <Section title="Payment">
        <StatStrip
          items={[
            { label: 'Diterima', value: formatMoney(payment.amount, payment.currency) },
            { label: 'Kredit belum dipakai', value: formatMoney(payment.unallocated, payment.currency) },
          ]}
        />
        <FieldGrid
          items={[
            { label: 'Diterima pada', value: formatBusinessDate(payment.received_at) },
            { label: 'Metode', value: labelFor(payment.method) },
            { label: 'Referensi', value: payment.reference },
            { label: 'Bukti transfer', value: payment.has_proof ? 'Terlampir' : undefined },
            { label: 'Catatan', value: payment.notes },
          ]}
        />
      </Section>
      <Section
        title="Alokasi"
        actions={ canManage && recorded && payment.unallocated !== '0' ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAllocating(true)}>
              Alokasikan
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={columns}
          data={payment.allocations}
          rowKey="id"
          actions={ canManage && recorded
              ? [{ label: 'Lepas', variant: 'danger', show: (item: PaymentAllocation) => !item.released_at, onClick: setReleasing }]
              : undefined
          }
          emptyMessage="Belum ada alokasi. Alokasikan payment ke invoice yang dibayarnya."
        />
      </Section>

      <FormDialog
        open={allocating}
        title="Alokasikan payment"
        description={`${formatMoney(payment.unallocated, payment.currency)} masih dapat dialokasikan.`}
        fields={[
          { name: 'invoice_id',
            label: 'Invoice',
            kind: 'select',
            required: true,
            options: openInvoices.map((invoice) => ({ value: invoice.id,
              label: `${invoice.number} · ${invoice.brand.name} · sisa ${formatMoney(invoice.balance, invoice.currency)}` })),
            hint: openInvoices.length === 0 ? 'Client ini tidak punya invoice terbit yang menunggu payment.' : undefined },
          { name: 'amount',
            label: 'Jumlah (Rp)',
            kind: 'rupiah',
            required: true,
            min: 1,
            validate: (value, values) => { const amount = read.rupiah(values, 'amount');
              if (amount === undefined || !value) return undefined;
              if (amount > minorToRupiah(payment.unallocated)) return 'Melebihi sisa payment.';
              const invoice = openInvoices.find((item) => item.id === values.invoice_id);
              if (invoice && amount > minorToRupiah(invoice.balance)) return 'Melebihi sisa invoice.';
              return undefined;
            } },
        ]}
        submitLabel="Alokasikan"
        onSubmit={(values) =>
          allocate.mutateAsync({ invoice_id: read.text(values, 'invoice_id'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0) })
        }
        onClose={() => setAllocating(false)}
      />
      <ConfirmDialog
        open={releasing !== null}
        title="Lepas alokasi"
        message={`${formatMoney(releasing?.amount, payment.currency)} kembali menjadi kredit client, dan ${releasing?.invoice.number ?? 'invoice'} menagihnya lagi.`}
        confirmLabel="Lepas"
        reason={{}}
        onConfirm={(values) => release.mutateAsync({ allocationId: releasing!.id, reason: read.text(values, 'reason') })}
        onClose={() => setReleasing(null)}
      />
      <ConfirmDialog
        open={reversing}
        title="Balikkan payment"
        message="Gunakan untuk payment yang salah dicatat. Semua alokasi akan dilepas dan payment tidak lagi dihitung. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Balikkan"
        reason={{}}
        onConfirm={(values) => reverse.mutateAsync(read.text(values, 'reason'))}
        onClose={() => setReversing(false)}
      />
      <FormDialog
        open={uploading}
        title="Lampirkan bukti transfer"
        description="Berkas PDF, JPG, atau PNG maksimal 5 MB. Bukti hanya dapat dilampirkan sekali."
        fields={[
          { name: 'file',
            label: 'Berkas bukti',
            kind: 'file',
            required: true,
            accept: 'application/pdf,image/jpeg,image/png',
            validate: (value) => proofProblem(value instanceof File ? value : null) },
        ]}
        submitLabel="Lampirkan bukti"
        onSubmit={(values) => upload.mutateAsync(read.file(values, 'file')!)}
        onClose={() => setUploading(false)}
      />
    </Page>
  );
}

export function PaymentDetailPage() { const { paymentId = '' } = useParams();
  const payment = usePayment(paymentId);
  return <QueryState query={payment} label="payment">{(data) => <PaymentView payment={data} />}</QueryState>;
}

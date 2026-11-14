import { DAlert, DDataTable, DEmptyState, useToast, type TableColumn } from '@digvation/ui';
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
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, isOpenInvoice, type Payment, type PaymentAllocation } from '../billing-api';
import { billingKeys, useInvoices, usePayment } from '../billing-queries';
import { proofProblem } from '../payment-rules';

const proofExtension = (contentType: string | null) =>
  contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : 'jpg';

function PaymentView({ payment }: { payment: Payment }) {
  const { showToast } = useToast();
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
    { success: 'Payment allocated', invalidate, toastErrors: false },
  );
  const release = useApiMutation(
    (input: { allocationId: string; reason: string }) => billingApi.release(payment.id, input.allocationId, input.reason),
    { success: 'Allocation released', invalidate, toastErrors: false },
  );
  const reverse = useApiMutation((reason: string) => billingApi.reverse(payment.id, reason), {
    success: 'Payment reversed',
    invalidate,
    toastErrors: false,
  });
  const upload = useApiMutation((file: File) => billingApi.uploadProof(payment.id, file), {
    success: 'Proof attached',
    invalidate,
    toastErrors: false,
  });

  async function downloadProof() {
    try {
      saveFile(await billingApi.proof(payment.id), `payment-proof-${payment.id.slice(0, 8)}.${proofExtension(payment.proof_content_type)}`);
    } catch (error) {
      showToast({ title: friendlyErrorMessage(error), description: errorReference(error), variant: 'danger' });
    }
  }

  const openInvoices = (invoices.data?.items ?? []).filter((invoice) => isOpenInvoice(invoice.status));
  const columns: TableColumn<PaymentAllocation>[] = [
    {
      key: 'invoice',
      label: 'Invoice',
      render: (item) => <Link to={`/invoices/${item.invoice.id}`}>{item.invoice.number ?? 'Invoice'}</Link>,
    },
    { key: 'amount', label: 'Amount', align: 'right', render: (item) => <span className="app-amount">{formatMoney(item.amount, payment.currency)}</span> },
    { key: 'created_at', label: 'Allocated', render: (item) => formatInstant(item.created_at) },
    { key: 'released_at', label: 'Released', render: (item) => (item.released_at ? formatInstant(item.released_at) : '—') },
  ];

  return (
    <Page>
      <Link className="app-back-link" to="/payments">
        ← Payments
      </Link>
      <PageHeader
        title={`${formatMoney(payment.amount, payment.currency)} from ${payment.client.name}`}
        meta={
          <>
            <Code>{payment.client.code}</Code>
            <StatusBadge status={payment.status} />
          </>
        }
        actions={
          <>
            {payment.has_proof ? (
              <AppAction icon={Download} tone="secondary" onClick={() => void downloadProof()}>
                Download proof
              </AppAction>
            ) : null}
            {canManage && recorded && !payment.has_proof ? (
              <AppAction icon={Upload} tone="secondary" onClick={() => setUploading(true)}>
                Attach proof
              </AppAction>
            ) : null}
            {canManage && recorded ? (
              <AppAction tone="danger-subtle" onClick={() => setReversing(true)}>
                Reverse
              </AppAction>
            ) : null}
          </>
        }
      />
      {payment.status === 'REVERSED' ? (
        <DAlert variant="danger">Reversed on {formatInstant(payment.reversed_at)}. Its allocations were released.</DAlert>
      ) : null}
      <Section title="Payment">
        <div className="app-summary">
          <div className="app-summary-item">
            <span>Received</span>
            <strong>{formatMoney(payment.amount, payment.currency)}</strong>
          </div>
          <div className="app-summary-item">
            <span>Unallocated (client credit)</span>
            <strong>{formatMoney(payment.unallocated, payment.currency)}</strong>
          </div>
        </div>
        <DetailList>
          <DetailItem label="Received on">{formatBusinessDate(payment.received_at)}</DetailItem>
          <DetailItem label="Method">{labelFor(payment.method)}</DetailItem>
          <DetailItem label="Reference">{payment.reference}</DetailItem>
          <DetailItem label="Proof">{payment.has_proof ? 'Attached' : undefined}</DetailItem>
          <DetailItem label="Notes" wide>
            {payment.notes}
          </DetailItem>
        </DetailList>
      </Section>
      <Section
        title="Allocations"
        actions={
          canManage && recorded && payment.unallocated !== '0' ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAllocating(true)}>
              Allocate
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={columns}
          data={payment.allocations}
          rowKey="id"
          actions={
            canManage && recorded
              ? [{ label: 'Release', variant: 'danger', show: (item: PaymentAllocation) => !item.released_at, onClick: setReleasing }]
              : undefined
          }
          emptyMessage={<DEmptyState title="Not allocated" description="Allocate the payment to the invoices it pays." />}
        />
      </Section>

      <FormDialog
        open={allocating}
        title="Allocate payment"
        description={`${formatMoney(payment.unallocated, payment.currency)} is left to allocate.`}
        fields={[
          {
            name: 'invoice_id',
            label: 'Invoice',
            kind: 'select',
            required: true,
            options: openInvoices.map((invoice) => ({
              value: invoice.id,
              label: `${invoice.number} · ${invoice.brand.name} · balance ${formatMoney(invoice.balance, invoice.currency)}`,
            })),
            hint: openInvoices.length === 0 ? 'The client has no issued invoice waiting for payment.' : undefined,
          },
          {
            name: 'amount',
            label: 'Amount (Rp)',
            kind: 'rupiah',
            required: true,
            min: 1,
            validate: (value, values) => {
              const amount = read.rupiah(values, 'amount');
              if (amount === undefined || !value) return undefined;
              if (amount > minorToRupiah(payment.unallocated)) return 'More than what is left of the payment.';
              const invoice = openInvoices.find((item) => item.id === values.invoice_id);
              if (invoice && amount > minorToRupiah(invoice.balance)) return 'More than the invoice balance.';
              return undefined;
            },
          },
        ]}
        submitLabel="Allocate"
        onSubmit={(values) =>
          allocate.mutateAsync({
            invoice_id: read.text(values, 'invoice_id'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
          })
        }
        onClose={() => setAllocating(false)}
      />
      <ConfirmDialog
        open={releasing !== null}
        title="Release allocation"
        message={`${formatMoney(releasing?.amount, payment.currency)} goes back to client credit and ${releasing?.invoice.number ?? 'the invoice'} owes it again.`}
        confirmLabel="Release"
        reason={{}}
        onConfirm={(values) => release.mutateAsync({ allocationId: releasing!.id, reason: read.text(values, 'reason') })}
        onClose={() => setReleasing(null)}
      />
      <ConfirmDialog
        open={reversing}
        title="Reverse payment"
        message="Use this for a payment recorded by mistake. Every allocation is released and the payment no longer counts. This cannot be undone."
        confirmLabel="Reverse"
        reason={{}}
        onConfirm={(values) => reverse.mutateAsync(read.text(values, 'reason'))}
        onClose={() => setReversing(false)}
      />
      <FormDialog
        open={uploading}
        title="Attach proof"
        description="A PDF, JPG or PNG of at most 5 MB. A proof can be attached once."
        fields={[
          {
            name: 'file',
            label: 'Proof file',
            kind: 'file',
            required: true,
            accept: 'application/pdf,image/jpeg,image/png',
            validate: (value) => proofProblem(value instanceof File ? value : null),
          },
        ]}
        submitLabel="Attach proof"
        onSubmit={(values) => upload.mutateAsync(read.file(values, 'file')!)}
        onClose={() => setUploading(false)}
      />
    </Page>
  );
}

export function PaymentDetailPage() {
  const { paymentId = '' } = useParams();
  const payment = usePayment(paymentId);
  return <QueryState query={payment} label="payment">{(data) => <PaymentView payment={data} />}</QueryState>;
}

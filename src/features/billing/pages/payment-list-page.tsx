import { DDataTable, DEmptyState, DStatusFilter, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, todayBusinessDate } from '../../../shared/format/date';
import { formatMoney, rupiahToMinor } from '../../../shared/format/money';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { useClientOptions } from '../../clients/clients-queries';
import { billingApi, type Payment } from '../billing-api';
import { billingKeys, usePayments } from '../billing-queries';
import { PAYMENT_METHODS } from '../payment-rules';

const COLUMNS: TableColumn<Payment>[] = [
  {
    key: 'client',
    label: 'Client',
    render: (payment) => (
      <RecordButton>
        <Identity primary={payment.client.name} secondary={payment.reference ?? labelFor(payment.method)} />
      </RecordButton>
    ),
  },
  { key: 'received_at', label: 'Received', render: (payment) => formatBusinessDate(payment.received_at) },
  { key: 'status', label: 'Status', render: (payment) => <StatusBadge status={payment.status} /> },
  { key: 'amount', label: 'Amount', align: 'right', render: (payment) => <span className="app-amount">{formatMoney(payment.amount, payment.currency)}</span> },
  {
    key: 'unallocated',
    label: 'Unallocated',
    align: 'right',
    render: (payment) => <span className="app-amount">{formatMoney(payment.unallocated, payment.currency)}</span>,
  },
  { key: 'has_proof', label: 'Proof', render: (payment) => (payment.has_proof ? 'Attached' : 'Missing') },
];

export function PaymentListPage() {
  const navigate = useNavigate();
  const list = useListState();
  const payments = usePayments(list.query);
  const { can } = usePermissions();
  const canRecord = can(PERMISSIONS.PAYMENTS_MANAGE) && can(PERMISSIONS.CLIENTS_READ);
  const clients = useClientOptions(canRecord);
  const [recording, setRecording] = useState(false);
  const record = useApiMutation(billingApi.recordPayment, {
    success: 'Payment recorded',
    invalidate: [billingKeys.all],
    toastErrors: false,
    onSuccess: (payment) => navigate(`/payments/${payment.id}`),
  });

  const fields: FieldSpec[] = [
    { name: 'client_id', label: 'Client', kind: 'select', required: true, options: clients.data ?? [] },
    {
      name: 'received_at',
      label: 'Received on',
      kind: 'date',
      required: true,
      half: true,
      validate: (value) =>
        typeof value === 'string' && value > todayBusinessDate() ? 'The date cannot be in the future.' : undefined,
    },
    { name: 'amount', label: 'Amount (Rp)', kind: 'rupiah', required: true, half: true, min: 1 },
    { name: 'method', label: 'Method', kind: 'select', required: true, half: true, options: PAYMENT_METHODS },
    { name: 'reference', label: 'Reference', maxLength: 200, half: true, placeholder: 'BCA 20261112-0001' },
    { name: 'notes', label: 'Notes', kind: 'textarea', maxLength: 1000 },
  ];

  return (
    <Page>
      <PageHeader
        title="Payments"
        description="Money received from clients. What is not allocated to an invoice stays as client credit."
        actions={
          canRecord ? (
            <AppAction icon={Plus} onClick={() => setRecording(true)}>
              Record payment
            </AppAction>
          ) : null
        }
      />
      <QueryState query={payments} label="payments">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search client or reference"
            {...list.tableProps}
            filters={
              <DStatusFilter
                label="Status"
                allLabel="All statuses"
                options={[
                  { value: 'RECORDED', label: 'Recorded' },
                  { value: 'REVERSED', label: 'Reversed' },
                ]}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
            emptyMessage={<DEmptyState title="No payments found" description="Record a payment when money arrives." />}
          />
        )}
      </QueryState>
      <FormDialog
        open={recording}
        title="Record payment"
        description="Allocate it to invoices and attach the proof on the next page."
        fields={fields}
        initialValues={{ method: 'BANK_TRANSFER', received_at: todayBusinessDate() }}
        submitLabel="Record payment"
        onSubmit={(values) =>
          record.mutateAsync({
            client_id: read.text(values, 'client_id'),
            received_at: read.text(values, 'received_at'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
            currency: 'IDR',
            method: read.text(values, 'method') as Payment['method'],
            reference: read.optional(values, 'reference'),
            notes: read.optional(values, 'notes'),
          })
        }
        onClose={() => setRecording(false)}
      />
    </Page>
  );
}

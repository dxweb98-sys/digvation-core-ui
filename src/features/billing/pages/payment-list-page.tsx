import { DDataTable, DStatusFilter, type TableColumn } from '@digvation/ui';
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
  { key: 'client',
    label: 'Client',
    render: (payment) => (
      <RecordButton>
        <Identity primary={payment.client.name} secondary={payment.reference ?? labelFor(payment.method)} />
      </RecordButton>
    ) },
  { key: 'received_at', label: 'Diterima', render: (payment) => formatBusinessDate(payment.received_at) },
  { key: 'status', label: 'Status', render: (payment) => <StatusBadge status={payment.status} /> },
  { key: 'amount', label: 'Jumlah', align: 'right', render: (payment) => <span className="app-amount">{formatMoney(payment.amount, payment.currency)}</span> },
  { key: 'unallocated',
    label: 'Belum dipakai',
    align: 'right',
    render: (payment) => <span className="app-amount">{formatMoney(payment.unallocated, payment.currency)}</span> },
  { key: 'has_proof', label: 'Bukti transfer', render: (payment) => (payment.has_proof ? 'Terlampir' : 'Belum ada') },
];

export function PaymentListPage() { const navigate = useNavigate();
  const list = useListState();
  const payments = usePayments(list.query);
  const { can } = usePermissions();
  const canRecord = can(PERMISSIONS.PAYMENTS_MANAGE) && can(PERMISSIONS.CLIENTS_READ);
  const clients = useClientOptions(canRecord);
  const [recording, setRecording] = useState(false);
  const record = useApiMutation(billingApi.recordPayment, { success: 'Payment dicatat',
    invalidate: [billingKeys.all],
    toastErrors: false,
    onSuccess: (payment) => navigate(`/payments/${payment.id}`) });

  const fields: FieldSpec[] = [
    { name: 'client_id', label: 'Client', kind: 'select', required: true, options: clients.data ?? [] },
    { name: 'received_at',
      label: 'Diterima pada',
      kind: 'date',
      required: true,
      half: true,
      validate: (value) =>
        typeof value === 'string' && value > todayBusinessDate() ? 'Tanggal tidak boleh di masa depan.' : undefined },
    { name: 'amount', label: 'Jumlah (Rp)', kind: 'rupiah', required: true, half: true, min: 1 },
    { name: 'method', label: 'Metode', kind: 'select', required: true, half: true, options: PAYMENT_METHODS },
    { name: 'reference', label: 'Referensi', maxLength: 200, half: true, placeholder: 'BCA 20261112-0001' },
    { name: 'notes', label: 'Catatan', kind: 'textarea', maxLength: 1000 },
  ];

  return (
    <Page>
      <PageHeader
        title="Payment"
        description="Dana yang diterima dari client. Yang tidak dialokasikan ke invoice tetap menjadi kredit client."
        actions={ canRecord ? (
            <AppAction icon={Plus} onClick={() => setRecording(true)}>
              Catat payment
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
            searchPlaceholder="Cari client atau referensi"
            {...list.tableProps}
            filters={ <DStatusFilter
                label="Status"
                allLabel="Semua status"
                options={[
                  { value: 'RECORDED', label: 'Tercatat' },
                  { value: 'REVERSED', label: 'Dibalikkan' },
                ]}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
            emptyMessage="Payment tidak ditemukan. Coba kata lain, atau catat payment saat dana masuk."
          />
        )}
      </QueryState>
      <FormDialog
        open={recording}
        title="Catat payment"
        description="Alokasikan ke invoice dan lampirkan bukti transfer di halaman berikutnya."
        fields={fields}
        initialValues={{ method: 'BANK_TRANSFER', received_at: todayBusinessDate() }}
        submitLabel="Catat payment"
        onSubmit={(values) =>
          record.mutateAsync({ client_id: read.text(values, 'client_id'),
            received_at: read.text(values, 'received_at'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
            currency: 'IDR',
            method: read.text(values, 'method') as Payment['method'],
            reference: read.optional(values, 'reference'),
            notes: read.optional(values, 'notes') })
        }
        onClose={() => setRecording(false)}
      />
    </Page>
  );
}

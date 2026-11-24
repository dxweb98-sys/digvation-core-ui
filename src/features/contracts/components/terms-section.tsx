import { DBadge, DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate } from '../../../shared/format/date';
import { formatMoney, rupiahToMinor, sumMinor } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Price } from '../../catalog/catalog-api';
import { contractsApi, isRenewalDraft, renewalChanged, type Contract, type Term } from '../contracts-api';
import { contractKeys } from '../contracts-queries';
import { termBody, termFields, termFormValues } from '../term-form';

function period(term: Term) { if (term.starts_at_go_live && !term.starts_on) { return `Saat go-live, ${term.duration_value} ${term.duration_unit === 'MONTH' ? 'bulan' : 'hari'}`;
  }
  return `${formatBusinessDate(term.starts_on)} – ${formatBusinessDate(term.ends_on)}`;
}

const COLUMNS: TableColumn<Term>[] = [
  { key: 'starts_on',
    label: 'Periode',
    render: (term) => (
      <Identity
        primary={period(term)}
        secondary={term.trial_ends_on ? `Trial sampai ${formatBusinessDate(term.trial_ends_on)}` : undefined}
      />
    ) },
  { key: 'status',
    label: 'Status',
    render: (term) => (
      <span className="app-page-actions">
        <StatusBadge status={term.status} />
        {isRenewalDraft(term) ? <DBadge variant="warning">Draf perpanjangan</DBadge> : null}
      </span>
    ) },
  { key: 'billing_cycle', label: 'Siklus', render: (term) => labelFor(term.billing_cycle) },
  { key: 'agreed_amount',
    label: 'Disepakati',
    align: 'right',
    render: (term) => (
      <Identity
        primary={<span className="app-amount">{formatMoney(term.agreed_amount, term.currency)}</span>}
        secondary={ term.list_amount && term.list_amount !== term.agreed_amount
            ? `List ${formatMoney(term.list_amount, term.currency)}`
            : term.adjustment_type !== 'NONE'
              ? labelFor(term.adjustment_type)
              : undefined
        }
      />
    ) },
  { key: 'one_off_charges',
    label: 'Biaya sekali',
    align: 'right',
    render: (term) =>
      term.one_off_charges.length === 0
        ? '—'
        : formatMoney(sumMinor(term.one_off_charges.map((charge) => charge.amount)), term.currency) },
  { key: 'payment_terms_days', label: 'Jatuh tempo', render: (term) => `${term.payment_terms_days} hari` },
];

export function TermsSection({ contract,
  prices,
  canManage }: { contract: Contract;
  prices: readonly Price[];
  canManage: boolean;
}) { const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [confirming, setConfirming] = useState<Term | null>(null);
  const [charges, setCharges] = useState<Term | null>(null);
  const [addingCharge, setAddingCharge] = useState(false);
  const [cycle, setCycle] = useState('MONTHLY');
  const invalidate = [contractKeys.all];
  const closed = contract.status === 'CANCELLED' || contract.status === 'EXPIRED';

  const add = useApiMutation((values: Parameters<typeof termBody>[0]) => contractsApi.addTerm(contract.id, termBody(values)), { success: 'Term ditambahkan sebagai draf',
    invalidate,
    toastErrors: false });
  const update = useApiMutation(
    (input: { termId: string; values: Parameters<typeof termBody>[0] }) =>
      contractsApi.updateTerm(contract.id, input.termId, termBody(input.values)),
    { success: 'Term tersimpan', invalidate, toastErrors: false },
  );
  const confirm = useApiMutation(
    (input: { termId: string; reason?: string }) =>
      contractsApi.confirmTerm(contract.id, input.termId, input.reason ? { reason: input.reason } : {}),
    { success: 'Term dikonfirmasi', invalidate, toastErrors: false },
  );
  const addCharge = useApiMutation(
    (input: { termId: string; description: string; amount: string }) =>
      contractsApi.addCharge(contract.id, input.termId, { description: input.description, amount: input.amount, currency: 'IDR' }),
    { success: 'Biaya sekali ditambahkan', invalidate, toastErrors: false },
  );
  const removeCharge = useApiMutation(
    (input: { termId: string; chargeId: string }) => contractsApi.removeCharge(contract.id, input.termId, input.chargeId),
    { success: 'Biaya sekali dihapus', invalidate },
  );

  const fields = useMemo(() => termFields(prices, cycle, editing && isRenewalDraft(editing) ? editing : undefined), [prices, cycle, editing]);
  const actions: TableAction<Term>[] = canManage
    ? [
        { label: 'Edit', show: (term) => term.status === 'DRAFT', onClick: (term) => { setCycle(term.billing_cycle); setEditing(term); } },
        { label: 'Konfirmasi', show: (term) => term.status === 'DRAFT', onClick: setConfirming },
        { label: 'Biaya sekali', onClick: setCharges },
      ]
    : [{ label: 'Biaya sekali', onClick: setCharges }];
  const chargesTerm = contract.terms.find((term) => term.id === charges?.id) ?? null;

  return (
    <Section
      title="Terms"
      actions={ canManage && !closed ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => { setCycle('MONTHLY'); setAdding(true); }}>
            Tambah term
          </AppAction>
        ) : null
      }
    >
      <DDataTable
        columns={COLUMNS}
        data={contract.terms}
        rowKey="id"
        actions={actions}
        emptyMessage="Belum ada term. Tambahkan term pertama dengan periode dan harga yang disepakati."
      />

      <FormDialog
        open={adding}
        kind="wide"
        title="Tambah term"
        description="Term baru berstatus draf. Setelah dikonfirmasi, term dijadwalkan dan tidak bisa diubah lagi."
        fields={fields}
        initialValues={termFormValues()}
        submitLabel="Tambah term"
        onValuesChange={(values) => setCycle(read.text(values, 'billing_cycle'))}
        onSubmit={(values) => add.mutateAsync(values)}
        onClose={() => setAdding(false)}
      />
      <FormDialog
        open={editing !== null}
        kind="wide"
        title={editing && isRenewalDraft(editing) ? 'Tinjau draf perpanjangan' : 'Edit term draf'}
        description={ editing && isRenewalDraft(editing) && editing.prefilled_amount
            ? `CORE mengisi otomatis ${formatMoney(editing.prefilled_amount, editing.currency)} ${labelFor(editing.prefilled_cycle ?? editing.billing_cycle).toLowerCase()}. Harga yang berbeda memerlukan alasan.`
            : undefined
        }
        fields={fields}
        initialValues={termFormValues(editing ?? undefined)}
        submitLabel="Simpan term"
        onValuesChange={(values) => setCycle(read.text(values, 'billing_cycle'))}
        onSubmit={(values) => update.mutateAsync({ termId: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={confirming !== null}
        title={confirming && isRenewalDraft(confirming) ? 'Konfirmasi perpanjangan' : 'Konfirmasi term'}
        message={ confirming
            ? `${period(confirming)} dengan harga ${formatMoney(confirming.agreed_amount, confirming.currency)} ${labelFor(confirming.billing_cycle).toLowerCase()}. Term yang dikonfirmasi dijadwalkan dan tidak bisa diubah lagi.`
            : ''
        }
        confirmLabel="Konfirmasi term"
        tone="primary"
        reason={confirming && renewalChanged(confirming) ? { label: 'Alasan perubahan harga perpanjangan' } : undefined}
        onConfirm={(values) => confirm.mutateAsync({ termId: confirming!.id, reason: read.omit(values, 'reason') })}
        onClose={() => setConfirming(null)}
      />
      {chargesTerm ? (
        <FormDialog
          open
          kind="wide"
          title="Biaya sekali"
          description={`${period(chargesTerm)}. Biaya sekali ditagih satu kali bersama invoice pertama term ini.`}
          fields={[]}
          submitLabel="Selesai"
          onSubmit={async () => undefined}
          onClose={() => setCharges(null)}
        >
          <DDataTable
            columns={[
              { key: 'description', label: 'Deskripsi' },
              { key: 'amount',
                label: 'Jumlah',
                align: 'right',
                render: (charge) => <span className="app-amount">{formatMoney(charge.amount, charge.currency)}</span> },
            ]}
            data={chargesTerm.one_off_charges}
            rowKey="id"
            headerActions={ canManage && chargesTerm.status === 'DRAFT' ? (
                <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingCharge(true)}>
                  Tambah biaya
                </AppAction>
              ) : undefined
            }
            actions={ canManage && chargesTerm.status === 'DRAFT'
                ? [
                    { label: 'Hapus',
                      variant: 'danger',
                      onClick: (charge) => void removeCharge.mutate({ termId: chargesTerm.id, chargeId: charge.id }) },
                  ]
                : undefined
            }
            emptyMessage="Belum ada biaya sekali. Biaya penyiapan dan biaya sejenis dicatat di sini."
          />
        </FormDialog>
      ) : null}
      <FormDialog
        open={addingCharge}
        title="Tambah biaya sekali"
        fields={[
          { name: 'description', label: 'Deskripsi', required: true, maxLength: 300, placeholder: 'Pembuatan website' },
          { name: 'amount', label: 'Jumlah (Rp)', kind: 'rupiah', required: true, min: 1 },
        ]}
        submitLabel="Tambah biaya"
        onSubmit={(values) =>
          addCharge.mutateAsync({ termId: chargesTerm!.id,
            description: read.text(values, 'description'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0) })
        }
        onClose={() => setAddingCharge(false)}
      />
    </Section>
  );
}

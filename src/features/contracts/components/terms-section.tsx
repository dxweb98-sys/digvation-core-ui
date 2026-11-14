import { DBadge, DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
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

function period(term: Term) {
  if (term.starts_at_go_live && !term.starts_on) {
    return `At go-live, ${term.duration_value} ${term.duration_unit === 'MONTH' ? 'months' : 'days'}`;
  }
  return `${formatBusinessDate(term.starts_on)} – ${formatBusinessDate(term.ends_on)}`;
}

const COLUMNS: TableColumn<Term>[] = [
  {
    key: 'starts_on',
    label: 'Period',
    render: (term) => (
      <Identity
        primary={period(term)}
        secondary={term.trial_ends_on ? `Trial until ${formatBusinessDate(term.trial_ends_on)}` : undefined}
      />
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (term) => (
      <span className="app-page-actions">
        <StatusBadge status={term.status} />
        {isRenewalDraft(term) ? <DBadge variant="warning">Renewal draft</DBadge> : null}
      </span>
    ),
  },
  { key: 'billing_cycle', label: 'Cycle', render: (term) => labelFor(term.billing_cycle) },
  {
    key: 'agreed_amount',
    label: 'Agreed',
    align: 'right',
    render: (term) => (
      <Identity
        primary={<span className="app-amount">{formatMoney(term.agreed_amount, term.currency)}</span>}
        secondary={
          term.list_amount && term.list_amount !== term.agreed_amount
            ? `List ${formatMoney(term.list_amount, term.currency)}`
            : term.adjustment_type !== 'NONE'
              ? labelFor(term.adjustment_type)
              : undefined
        }
      />
    ),
  },
  {
    key: 'one_off_charges',
    label: 'One-off',
    align: 'right',
    render: (term) =>
      term.one_off_charges.length === 0
        ? '—'
        : formatMoney(sumMinor(term.one_off_charges.map((charge) => charge.amount)), term.currency),
  },
  { key: 'payment_terms_days', label: 'Due after', render: (term) => `${term.payment_terms_days} days` },
];

export function TermsSection({
  contract,
  prices,
  canManage,
}: {
  contract: Contract;
  prices: readonly Price[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [confirming, setConfirming] = useState<Term | null>(null);
  const [charges, setCharges] = useState<Term | null>(null);
  const [addingCharge, setAddingCharge] = useState(false);
  const [cycle, setCycle] = useState('MONTHLY');
  const invalidate = [contractKeys.all];
  const closed = contract.status === 'CANCELLED' || contract.status === 'EXPIRED';

  const add = useApiMutation((values: Parameters<typeof termBody>[0]) => contractsApi.addTerm(contract.id, termBody(values)), {
    success: 'Term added as a draft',
    invalidate,
    toastErrors: false,
  });
  const update = useApiMutation(
    (input: { termId: string; values: Parameters<typeof termBody>[0] }) =>
      contractsApi.updateTerm(contract.id, input.termId, termBody(input.values)),
    { success: 'Term saved', invalidate, toastErrors: false },
  );
  const confirm = useApiMutation(
    (input: { termId: string; reason?: string }) =>
      contractsApi.confirmTerm(contract.id, input.termId, input.reason ? { reason: input.reason } : {}),
    { success: 'Term confirmed', invalidate, toastErrors: false },
  );
  const addCharge = useApiMutation(
    (input: { termId: string; description: string; amount: string }) =>
      contractsApi.addCharge(contract.id, input.termId, { description: input.description, amount: input.amount, currency: 'IDR' }),
    { success: 'One-off charge added', invalidate, toastErrors: false },
  );
  const removeCharge = useApiMutation(
    (input: { termId: string; chargeId: string }) => contractsApi.removeCharge(contract.id, input.termId, input.chargeId),
    { success: 'One-off charge removed', invalidate },
  );

  const fields = useMemo(() => termFields(prices, cycle, editing && isRenewalDraft(editing) ? editing : undefined), [prices, cycle, editing]);
  const actions: TableAction<Term>[] = canManage
    ? [
        { label: 'Edit', show: (term) => term.status === 'DRAFT', onClick: (term) => { setCycle(term.billing_cycle); setEditing(term); } },
        { label: 'Confirm', show: (term) => term.status === 'DRAFT', onClick: setConfirming },
        { label: 'One-off charges', onClick: setCharges },
      ]
    : [{ label: 'One-off charges', onClick: setCharges }];
  const chargesTerm = contract.terms.find((term) => term.id === charges?.id) ?? null;

  return (
    <Section
      title="Terms"
      actions={
        canManage && !closed ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => { setCycle('MONTHLY'); setAdding(true); }}>
            Add term
          </AppAction>
        ) : null
      }
    >
      <DDataTable
        columns={COLUMNS}
        data={contract.terms}
        rowKey="id"
        actions={actions}
        emptyMessage={<DEmptyState title="No terms" description="Add the first term with its period and agreed price." />}
      />

      <FormDialog
        open={adding}
        kind="wide"
        title="Add term"
        description="A new term is a draft. Confirming it schedules it; it cannot be changed after that."
        fields={fields}
        initialValues={termFormValues()}
        submitLabel="Add term"
        onValuesChange={(values) => setCycle(read.text(values, 'billing_cycle'))}
        onSubmit={(values) => add.mutateAsync(values)}
        onClose={() => setAdding(false)}
      />
      <FormDialog
        open={editing !== null}
        kind="wide"
        title={editing && isRenewalDraft(editing) ? 'Review renewal draft' : 'Edit draft term'}
        description={
          editing && isRenewalDraft(editing) && editing.prefilled_amount
            ? `CORE prefilled ${formatMoney(editing.prefilled_amount, editing.currency)} ${labelFor(editing.prefilled_cycle ?? editing.billing_cycle).toLowerCase()}. A different price needs a reason.`
            : undefined
        }
        fields={fields}
        initialValues={termFormValues(editing ?? undefined)}
        submitLabel="Save term"
        onValuesChange={(values) => setCycle(read.text(values, 'billing_cycle'))}
        onSubmit={(values) => update.mutateAsync({ termId: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={confirming !== null}
        title={confirming && isRenewalDraft(confirming) ? 'Confirm renewal' : 'Confirm term'}
        message={
          confirming
            ? `${period(confirming)} at ${formatMoney(confirming.agreed_amount, confirming.currency)} ${labelFor(confirming.billing_cycle).toLowerCase()}. A confirmed term is scheduled and can no longer be edited.`
            : ''
        }
        confirmLabel="Confirm term"
        tone="primary"
        reason={confirming && renewalChanged(confirming) ? { label: 'Why the renewal price changed' } : undefined}
        onConfirm={(values) => confirm.mutateAsync({ termId: confirming!.id, reason: read.omit(values, 'reason') })}
        onClose={() => setConfirming(null)}
      />
      {chargesTerm ? (
        <FormDialog
          open
          kind="wide"
          title="One-off charges"
          description={`${period(chargesTerm)}. One-off charges are billed once with the term's first invoice.`}
          fields={[]}
          submitLabel="Done"
          onSubmit={async () => undefined}
          onClose={() => setCharges(null)}
        >
          <DDataTable
            columns={[
              { key: 'description', label: 'Description' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (charge) => <span className="app-amount">{formatMoney(charge.amount, charge.currency)}</span>,
              },
            ]}
            data={chargesTerm.one_off_charges}
            rowKey="id"
            headerActions={
              canManage && chargesTerm.status === 'DRAFT' ? (
                <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingCharge(true)}>
                  Add charge
                </AppAction>
              ) : undefined
            }
            actions={
              canManage && chargesTerm.status === 'DRAFT'
                ? [
                    {
                      label: 'Remove',
                      variant: 'danger',
                      onClick: (charge) => void removeCharge.mutate({ termId: chargesTerm.id, chargeId: charge.id }),
                    },
                  ]
                : undefined
            }
            emptyMessage={<DEmptyState title="No one-off charges" description="Setup fees and similar charges go here." />}
          />
        </FormDialog>
      ) : null}
      <FormDialog
        open={addingCharge}
        title="Add one-off charge"
        fields={[
          { name: 'description', label: 'Description', required: true, maxLength: 300, placeholder: 'Pembuatan website' },
          { name: 'amount', label: 'Amount (Rp)', kind: 'rupiah', required: true, min: 1 },
        ]}
        submitLabel="Add charge"
        onSubmit={(values) =>
          addCharge.mutateAsync({
            termId: chargesTerm!.id,
            description: read.text(values, 'description'),
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
          })
        }
        onClose={() => setAddingCharge(false)}
      />
    </Section>
  );
}

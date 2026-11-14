import { DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate } from '../../../shared/format/date';
import { formatMoney, rupiahToMinor } from '../../../shared/format/money';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { isOpenService } from '../../services/services-api';
import { useService } from '../../services/services-queries';
import { contractsApi, type AdjustmentType, type Contract, type ContractAddOn } from '../contracts-api';
import { contractKeys } from '../contracts-queries';

const COLUMNS: TableColumn<ContractAddOn>[] = [
  { key: 'add_on', label: 'Add-on', render: (item) => <Identity primary={item.add_on.name} secondary={item.add_on.code} /> },
  {
    key: 'effective_from',
    label: 'Billed',
    render: (item) =>
      `${formatBusinessDate(item.effective_from)} – ${item.effective_until ? formatBusinessDate(item.effective_until) : 'with the service'}`,
  },
  {
    key: 'agreed_amount',
    label: 'Agreed per cycle',
    align: 'right',
    render: (item) => (
      <Identity
        primary={<span className="app-amount">{formatMoney(item.agreed_amount, item.currency)}</span>}
        secondary={item.adjustment_type !== 'NONE' ? labelFor(item.adjustment_type) : undefined}
      />
    ),
  },
  {
    key: 'initial_prorated_amount',
    label: 'First charge (prorated)',
    align: 'right',
    render: (item) => <span className="app-amount">{formatMoney(item.initial_prorated_amount, item.currency)}</span>,
  },
];

const ADJUSTMENTS = ['NONE', 'PROMOTIONAL', 'NEGOTIATED', 'GRANDFATHERED', 'COMPLIMENTARY'].map((value) => ({
  value,
  label: value === 'NONE' ? 'No adjustment' : labelFor(value),
}));

export function ContractAddOnsSection({ contract, canManage }: { contract: Contract; canManage: boolean }) {
  const service = useService(contract.service.client.id, contract.service.id);
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<ContractAddOn | null>(null);
  const invalidate = [contractKeys.all];
  const add = useApiMutation((body: Parameters<typeof contractsApi.addAddOn>[1]) => contractsApi.addAddOn(contract.id, body), {
    success: 'Add-on billed under the contract',
    invalidate,
    toastErrors: false,
  });
  const end = useApiMutation(
    (input: { id: string; until: string }) => contractsApi.endAddOn(contract.id, input.id, input.until),
    { success: 'Last billed day set', invalidate, toastErrors: false },
  );

  const billed = new Set(contract.add_ons.filter((item) => !item.effective_until).map((item) => item.client_add_on_id));
  const options = (service.data?.add_ons ?? [])
    .filter((held) => isOpenService(held.status) && !billed.has(held.id))
    .map((held) => ({ value: held.id, label: `${held.name} (${held.code})` }));
  const closed = contract.status === 'CANCELLED' || contract.status === 'EXPIRED';

  return (
    <Section
      title="Add-ons billed"
      actions={
        canManage && !closed ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAdding(true)}>
            Bill add-on
          </AppAction>
        ) : null
      }
    >
      <DDataTable
        columns={COLUMNS}
        data={contract.add_ons}
        rowKey="id"
        actions={
          canManage
            ? [{ label: 'Set last billed day', show: (item: ContractAddOn) => !item.effective_until, onClick: setEnding }]
            : undefined
        }
        emptyMessage={
          <DEmptyState title="No add-ons billed" description="Add-ons held by the service are billed here, prorated to the term." />
        }
      />
      <FormDialog
        open={adding}
        title="Bill add-on"
        description="The first charge is prorated from the first billed day to the end of that billing period."
        fields={[
          {
            name: 'client_add_on_id',
            label: 'Add-on held by the service',
            kind: 'select',
            required: true,
            options,
            hint: options.length === 0 ? 'Add the add-on to the service first.' : undefined,
          },
          { name: 'effective_from', label: 'First billed day', kind: 'date', required: true, half: true, hint: 'Inside an active or scheduled term.' },
          { name: 'agreed_amount', label: 'Agreed per cycle (Rp)', kind: 'rupiah', required: true, half: true },
          { name: 'adjustment_type', label: 'Price adjustment', kind: 'select', required: true, half: true, options: ADJUSTMENTS },
          {
            name: 'adjustment_reason',
            label: 'Adjustment reason',
            kind: 'textarea',
            maxLength: 500,
            validate: (value, values) =>
              values.adjustment_type !== 'NONE' && !(typeof value === 'string' && value.trim())
                ? 'Give a reason for the adjustment.'
                : undefined,
          },
        ]}
        initialValues={{ adjustment_type: 'NONE' }}
        submitLabel="Bill add-on"
        onSubmit={(values) =>
          add.mutateAsync({
            client_add_on_id: read.text(values, 'client_add_on_id'),
            effective_from: read.text(values, 'effective_from'),
            agreed_amount: rupiahToMinor(read.rupiah(values, 'agreed_amount') ?? 0),
            adjustment_type: read.text(values, 'adjustment_type') as AdjustmentType,
            adjustment_reason: read.optional(values, 'adjustment_reason'),
          })
        }
        onClose={() => setAdding(false)}
      />
      <FormDialog
        open={ending !== null}
        title={`Stop billing ${ending?.add_on.name ?? ''}`}
        fields={[{ name: 'effective_until', label: 'Last billed day', kind: 'date', required: true }]}
        submitLabel="Set last day"
        onSubmit={(values) => end.mutateAsync({ id: ending!.id, until: read.text(values, 'effective_until') })}
        onClose={() => setEnding(null)}
      />
    </Section>
  );
}

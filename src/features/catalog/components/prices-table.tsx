import { DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { formatInstant } from '../../../shared/format/date';
import { formatMoney, minorToRupiah, rupiahToMinor } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { BILLING_CYCLES, type BillingCycle, type Price } from '../catalog-api';

const COLUMNS: TableColumn<Price>[] = [
  { key: 'billing_cycle', label: 'Billing cycle', render: (price) => labelFor(price.billing_cycle) },
  { key: 'currency', label: 'Currency' },
  {
    key: 'amount',
    label: 'List price',
    align: 'right',
    render: (price) => <span className="app-amount">{formatMoney(price.amount, price.currency)}</span>,
  },
  { key: 'updated_at', label: 'Updated', render: (price) => formatInstant(price.updated_at) },
];

const PRICE_FIELDS: FieldSpec[] = [
  {
    name: 'billing_cycle',
    label: 'Billing cycle',
    kind: 'select',
    required: true,
    half: true,
    options: BILLING_CYCLES.map((cycle) => ({ value: cycle, label: labelFor(cycle) })),
    hint: 'Per term: one price for the whole contract term.',
  },
  { name: 'amount', label: 'List price (Rp)', kind: 'rupiah', required: true, half: true, placeholder: '1.500.000' },
];

export interface PriceInput {
  billing_cycle: BillingCycle;
  currency: string;
  amount: string;
}

/** Catalog list prices in IDR. Setting a cycle that already has a price replaces it. */
export function PricesTable({
  prices,
  canManage,
  onSet,
  onDelete,
}: {
  prices: readonly Price[];
  canManage: boolean;
  onSet: (input: PriceInput) => Promise<unknown>;
  onDelete: (price: Price) => Promise<unknown>;
}) {
  const [setting, setSetting] = useState<Partial<PriceInput> | null>(null);
  const [deleting, setDeleting] = useState<Price | null>(null);

  return (
    <>
      <DDataTable
        columns={COLUMNS}
        data={prices}
        rowKey="id"
        headerActions={
          canManage ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setSetting({})}>
              Set price
            </AppAction>
          ) : undefined
        }
        actions={
          canManage
            ? [
                {
                  label: 'Change',
                  show: (price) => price.currency === 'IDR',
                  onClick: (price) => setSetting({ billing_cycle: price.billing_cycle, amount: price.amount }),
                },
                { label: 'Delete', variant: 'danger', onClick: setDeleting },
              ]
            : undefined
        }
        emptyMessage={<DEmptyState title="No list price" description="Without a list price, every contract states its own price." />}
      />
      <FormDialog
        open={setting !== null}
        title="Set list price"
        description="Contracts keep the price they were agreed at; a new list price applies to new terms."
        fields={PRICE_FIELDS}
        initialValues={{
          billing_cycle: setting?.billing_cycle ?? '',
          amount: setting?.amount ? String(minorToRupiah(setting.amount)) : '',
        }}
        submitLabel="Save price"
        onSubmit={(values) =>
          onSet({
            billing_cycle: read.text(values, 'billing_cycle') as BillingCycle,
            currency: 'IDR',
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0),
          })
        }
        onClose={() => setSetting(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete list price"
        message={`The ${labelFor(deleting?.billing_cycle).toLowerCase()} list price is removed. Existing contracts keep their agreed price.`}
        confirmLabel="Delete"
        onConfirm={() => onDelete(deleting!)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

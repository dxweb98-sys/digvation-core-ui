import { DDataTable, type TableColumn } from '@digvation/ui';
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
  { key: 'billing_cycle', label: 'Siklus tagih', render: (price) => labelFor(price.billing_cycle) },
  { key: 'currency', label: 'Currency' },
  { key: 'amount',
    label: 'Harga list',
    align: 'right',
    render: (price) => <span className="app-amount">{formatMoney(price.amount, price.currency)}</span> },
  { key: 'updated_at', label: 'Diperbarui', render: (price) => formatInstant(price.updated_at) },
];

const PRICE_FIELDS: FieldSpec[] = [
  { name: 'billing_cycle',
    label: 'Siklus tagih',
    kind: 'select',
    required: true,
    half: true,
    options: BILLING_CYCLES.map((cycle) => ({ value: cycle, label: labelFor(cycle) })),
    hint: 'Per term: satu harga untuk seluruh jangka waktu contract.' },
  { name: 'amount', label: 'Harga list (Rp)', kind: 'rupiah', required: true, half: true, placeholder: '1.500.000' },
];

export interface PriceInput { billing_cycle: BillingCycle;
  currency: string;
  amount: string;
}

/** Catalog list prices in IDR. Setting a cycle that already has a price replaces it. */
export function PricesTable({ prices,
  canManage,
  onSet,
  onDelete }: { prices: readonly Price[];
  canManage: boolean;
  onSet: (input: PriceInput) => Promise<unknown>;
  onDelete: (price: Price) => Promise<unknown>;
}) { const [setting, setSetting] = useState<Partial<PriceInput> | null>(null);
  const [deleting, setDeleting] = useState<Price | null>(null);

  return (
    <>
      <DDataTable
        columns={COLUMNS}
        data={prices}
        rowKey="id"
        headerActions={ canManage ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setSetting({})}>
              Atur harga
            </AppAction>
          ) : undefined
        }
        actions={ canManage
            ? [
                { label: 'Ubah',
                  show: (price) => price.currency === 'IDR',
                  onClick: (price) => setSetting({ billing_cycle: price.billing_cycle, amount: price.amount }) },
                { label: 'Hapus', variant: 'danger', onClick: setDeleting },
              ]
            : undefined
        }
        emptyMessage="Belum ada harga list. Tanpa harga list, setiap contract menentukan harganya sendiri."
      />
      <FormDialog
        open={setting !== null}
        title="Atur harga list"
        description="Contract menyimpan harga yang disepakati; harga list baru berlaku untuk term baru."
        fields={PRICE_FIELDS}
        initialValues={{ billing_cycle: setting?.billing_cycle ?? '',
          amount: setting?.amount ? String(minorToRupiah(setting.amount)) : '' }}
        submitLabel="Simpan harga"
        onSubmit={(values) =>
          onSet({ billing_cycle: read.text(values, 'billing_cycle') as BillingCycle,
            currency: 'IDR',
            amount: rupiahToMinor(read.rupiah(values, 'amount') ?? 0) })
        }
        onClose={() => setSetting(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus harga list"
        message={`Harga list ${labelFor(deleting?.billing_cycle).toLowerCase()} dihapus. Contract yang sudah ada tetap memakai harga yang disepakati.`}
        confirmLabel="Hapus"
        onConfirm={() => onDelete(deleting!)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

import { DButton, DDialog, DInput, DSelect } from '@digvation/ui';
import { useState } from 'react';
import type {
  BillingCycle,
  UpsertCatalogPriceInput,
} from '../types/commercial-catalog';

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-annual' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function CatalogPriceDialog({
  title,
  open,
  initial,
  loading,
  onClose,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initial?: UpsertCatalogPriceInput;
  loading: boolean;
  onClose: () => void;
  onSubmit: (input: UpsertCatalogPriceInput) => Promise<void>;
}) {
  const [values, setValues] = useState<UpsertCatalogPriceInput>(() =>
    initial ?? {
      billingCycle: 'MONTHLY',
      currency: 'IDR',
      amountMinor: 0,
    },
  );

  return (
    <DDialog
      open={open}
      onClose={onClose}
      title={title}
      description="Catalog price is the canonical list price. Client-agreed prices are snapshotted separately in subscription terms."
      footer={
        <div className="commercial-dialog-actions">
          <DButton variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </DButton>
          <DButton
            form="catalog-price-form"
            type="submit"
            loading={loading}
          >
            Save Catalog Price
          </DButton>
        </div>
      }
    >
      <form
        id="catalog-price-form"
        className="commercial-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(values);
        }}
      >
        <DSelect
          label="Billing Cycle *"
          value={values.billingCycle}
          options={CYCLE_OPTIONS}
          onValueChange={(billingCycle) =>
            setValues((current) => ({
              ...current,
              billingCycle: billingCycle as BillingCycle,
            }))
          }
        />
        <DInput
          label="Currency *"
          value={values.currency}
          maxLength={3}
          onChange={(currency) =>
            setValues((current) => ({
              ...current,
              currency: currency.toUpperCase(),
            }))
          }
        />
        <DInput
          label="List Price (IDR) *"
          type="number"
          value={String(values.amountMinor / 100)}
          onChange={(amount) =>
            setValues((current) => ({
              ...current,
              amountMinor: Math.max(0, Number(amount || 0) * 100),
            }))
          }
        />
      </form>
    </DDialog>
  );
}

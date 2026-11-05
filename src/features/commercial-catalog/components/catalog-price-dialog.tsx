import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppCurrencyInput, AppInput, AppSelect } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';

import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type {
  BillingCycle,
  UpsertCatalogPriceInput,
} from '../types/commercial-catalog';
import { majorToMinorValue, minorToMajorValue } from '../utils/money';

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
  const { field, allowSubmit } = useFieldErrors<'currency' | 'amountMinor'>(
    'catalog-price-form',
    () => ({
      ...(/^[A-Z]{3}$/.test(values.currency)
        ? {}
        : { currency: 'Use a three-letter currency code, such as IDR.' }),
      ...(Number.isSafeInteger(values.amountMinor) && values.amountMinor >= 0
        ? {}
        : { amountMinor: 'Enter an amount of 0 or more.' }),
    }),
  );

  return (
    <AppDialog kind="form"
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="commercial-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </AppAction>
          <AppAction
            form="catalog-price-form"
            type="submit"
            loading={loading}
          >
            Save
          </AppAction>
        </div>
      }
    >
      <form
        id="catalog-price-form"
        className="commercial-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!allowSubmit()) return;
          void onSubmit(values);
        }}
      >
        <AppSelect
          label="Billing cycle" placeholder="Select a billing cycle"
          value={values.billingCycle}
          options={CYCLE_OPTIONS}
          clearable={false}
          onValueChange={(billingCycle) => {
            if (typeof billingCycle !== 'string') return;
            setValues((current) => ({
              ...current,
              billingCycle: billingCycle as BillingCycle,
            }));
          }}
        />
        <AppInput
          {...field('currency')}
          label="Currency" placeholder="IDR"
          value={values.currency}
          maxLength={3}
          onChange={(currency) =>
            setValues((current) => ({
              ...current,
              currency: currency.toUpperCase(),
            }))
          }
        />
        <AppCurrencyInput
          {...field('amountMinor')}
          label="List price" placeholder="2,400,000"
          value={minorToMajorValue(values.amountMinor)}
          currencySymbol={values.currency}
          onValueChange={(amount) =>
            setValues((current) => ({
              ...current,
              amountMinor: majorToMinorValue(amount),
            }))
          }
        />
      </form>
    </AppDialog>
  );
}


import { labelFor } from '../../../shared/labels/labels';
import { AppCurrencyInput, AppInput, AppSelect } from '../../../shared/ui/form-fields';
import type {
  BillingCycle,
  CatalogPrice,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
import {
  formatMoney,
  majorToMinorValue,
  minorToMajorValue,
} from '../../commercial-catalog/utils/money';
import type { CommercialTermInput } from '../types/subscription';

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-annual' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
];

const ADJUSTMENT_OPTIONS = [
  { value: 'NONE', label: 'No adjustment' },
  { value: 'PROMOTIONAL', label: 'Promotional' },
  { value: 'NEGOTIATED', label: 'Negotiated' },
  { value: 'GRANDFATHERED', label: 'Grandfathered' },
  { value: 'COMPLIMENTARY', label: 'Complimentary' },
];

export function findCatalogPrice(
  prices: CatalogPrice[],
  values: Pick<CommercialTermInput, 'billingCycle' | 'currency'>,
) {
  return prices.find(
    (price) =>
      price.billingCycle === values.billingCycle &&
      price.currency === values.currency.toUpperCase(),
  );
}

export type TermField =
  | 'startsAt'
  | 'endsAt'
  | 'currency'
  | 'agreedAmountMinor'
  | 'adjustmentReason'
  | 'paymentTermsDays';

type TermFieldProps = (name: TermField) => {
  onBlur: () => void;
  error: string | undefined;
};

export function CommercialTermFields({
  values,
  prices,
  onChange,
  field,
  lockStart = false,
  lockBillingBasis = false,
}: {
  values: CommercialTermInput;
  prices: CatalogPrice[];
  onChange: (next: CommercialTermInput) => void;
  field: TermFieldProps;
  lockStart?: boolean;
  lockBillingBasis?: boolean;
}) {
  const catalogPrice = findCatalogPrice(prices, values);
  const agreedAmountMinor = values.agreedAmountMinor ?? catalogPrice?.amountMinor;

  return (
    <>
      <div className="client-form-grid">
        <AppInput
          {...field('startsAt')}
          label="Starts"
          placeholder="YYYY-MM-DD"
          value={values.startsAt}
          disabled={lockStart}
          onChange={(startsAt) => onChange({ ...values, startsAt })}
        />
        <AppInput
          {...field('endsAt')}
          label="Ends" optional
          placeholder="YYYY-MM-DD"
          value={values.endsAt ?? ''}
          onChange={(endsAt) => onChange({ ...values, endsAt })}
        />
      </div>
      <div className="client-form-grid">
        {lockBillingBasis ? (
          <AppInput
            label="Billing cycle" placeholder="Select a billing cycle"
            value={labelFor(values.billingCycle)}
            disabled
            onChange={() => undefined}
          />
        ) : (
          <AppSelect
            label="Billing cycle" placeholder="Select a billing cycle"
            value={values.billingCycle}
            options={CYCLE_OPTIONS}
            clearable={false}
            onValueChange={(billingCycle) => {
              if (typeof billingCycle !== 'string') return;
              onChange({
                ...values,
                billingCycle: billingCycle as BillingCycle,
                agreedAmountMinor: undefined,
              });
            }}
          />
        )}
        <AppInput
          {...field('currency')}
          label="Currency" placeholder="IDR"
          value={values.currency}
          maxLength={3}
          disabled={lockBillingBasis}
          onChange={(currency) =>
            onChange({
              ...values,
              currency: currency.toUpperCase(),
              agreedAmountMinor: undefined,
            })
          }
        />
      </div>
      <div className="client-commercial-price-context">
        <span>List price</span>
        <strong>
          {catalogPrice
            ? formatMoney(catalogPrice.amountMinor, catalogPrice.currency)
            : 'No list price for this billing cycle and currency'}
        </strong>
      </div>
      <div className="client-form-grid">
        <AppCurrencyInput
          {...field('agreedAmountMinor')}
          label="Agreed price" placeholder="2,400,000"
          value={
            agreedAmountMinor === undefined
              ? ''
              : minorToMajorValue(agreedAmountMinor)
          }
          currencySymbol={values.currency}
          disabled={
            !catalogPrice ||
            values.adjustmentType === 'NONE' ||
            values.adjustmentType === 'COMPLIMENTARY'
          }
          onValueChange={(amount) =>
            onChange({
              ...values,
              agreedAmountMinor: majorToMinorValue(amount),
            })
          }
        />
        <AppSelect
          label="Adjustment" placeholder="Select an adjustment"
          value={values.adjustmentType}
          options={ADJUSTMENT_OPTIONS}
          clearable={false}
          onValueChange={(adjustmentType) => {
            if (typeof adjustmentType !== 'string') return;
            const next = adjustmentType as CommercialAdjustmentType;
            onChange({
              ...values,
              adjustmentType: next,
              agreedAmountMinor:
                next === 'COMPLIMENTARY'
                  ? 0
                  : next === 'NONE' ||
                      values.adjustmentType === 'COMPLIMENTARY'
                    ? undefined
                    : values.agreedAmountMinor,
              adjustmentReason:
                next === 'NONE' ? undefined : values.adjustmentReason,
            });
          }}
        />
      </div>
      {values.adjustmentType !== 'NONE' ? (
        <AppInput
          {...field('adjustmentReason')}
          label="Adjustment reason" placeholder="Annual contract discount"
          value={values.adjustmentReason ?? ''}
          onChange={(adjustmentReason) =>
            onChange({ ...values, adjustmentReason })
          }
        />
      ) : null}
      <AppInput
        {...field('paymentTermsDays')}
        label="Payment terms (days)" placeholder="30" optional
        type="number"
        value={String(values.paymentTermsDays ?? '')}
        onChange={(paymentTermsDays) =>
          onChange({
            ...values,
            paymentTermsDays: paymentTermsDays
              ? Number(paymentTermsDays)
              : undefined,
          })
        }
      />
    </>
  );
}

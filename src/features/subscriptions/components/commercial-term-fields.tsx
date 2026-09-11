import { DCurrencyInput, DInput, DSelect } from '@digvation/ui';
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

export function CommercialTermFields({
  values,
  prices,
  onChange,
  lockStart = false,
  lockBillingBasis = false,
}: {
  values: CommercialTermInput;
  prices: CatalogPrice[];
  onChange: (next: CommercialTermInput) => void;
  lockStart?: boolean;
  lockBillingBasis?: boolean;
}) {
  const catalogPrice = findCatalogPrice(prices, values);
  const agreedAmountMinor = values.agreedAmountMinor ?? catalogPrice?.amountMinor;

  return (
    <>
      <div className="client-form-grid">
        <DInput
          label="Starts *"
          placeholder="YYYY-MM-DD"
          value={values.startsAt}
          disabled={lockStart}
          onChange={(startsAt) => onChange({ ...values, startsAt })}
        />
        <DInput
          label="Ends"
          placeholder="YYYY-MM-DD"
          value={values.endsAt ?? ''}
          onChange={(endsAt) => onChange({ ...values, endsAt })}
        />
      </div>
      <div className="client-form-grid">
        {lockBillingBasis ? (
          <DInput
            label="Billing Cycle *"
            value={values.billingCycle.replace('_', ' ')}
            disabled
            onChange={() => undefined}
          />
        ) : (
          <DSelect
            label="Billing Cycle *"
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
        <DInput
          label="Currency *"
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
        <span>Catalog list price</span>
        <strong>
          {catalogPrice
            ? formatMoney(catalogPrice.amountMinor, catalogPrice.currency)
            : 'No catalog price for this cycle/currency'}
        </strong>
      </div>
      <div className="client-form-grid">
        <DCurrencyInput
          label="Agreed Price *"
          value={
            agreedAmountMinor === undefined
              ? ''
              : minorToMajorValue(agreedAmountMinor)
          }
          currencySymbol={values.currency || '—'}
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
        <DSelect
          label="Adjustment *"
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
        <DInput
          label="Adjustment Reason *"
          value={values.adjustmentReason ?? ''}
          onChange={(adjustmentReason) =>
            onChange({ ...values, adjustmentReason })
          }
        />
      ) : null}
      <DInput
        label="Payment Terms (days)"
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

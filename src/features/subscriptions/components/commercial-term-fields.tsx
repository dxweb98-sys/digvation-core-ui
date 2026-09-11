import { DInput, DSelect } from '@digvation/ui';
import type {
  BillingCycle,
  CatalogPrice,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
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

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

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
            onValueChange={(billingCycle) =>
              onChange({
                ...values,
                billingCycle: billingCycle as BillingCycle,
                agreedAmountMinor: undefined,
              })
            }
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
            ? money(catalogPrice.amountMinor, catalogPrice.currency)
            : 'No catalog price for this cycle/currency'}
        </strong>
      </div>
      <div className="client-form-grid">
        <DInput
          label="Agreed Price *"
          type="number"
          value={
            agreedAmountMinor === undefined
              ? ''
              : String(agreedAmountMinor / 100)
          }
          disabled={!catalogPrice}
          onChange={(amount) =>
            onChange({
              ...values,
              agreedAmountMinor: Math.max(0, Number(amount || 0) * 100),
            })
          }
        />
        <DSelect
          label="Adjustment *"
          value={values.adjustmentType}
          options={ADJUSTMENT_OPTIONS}
          onValueChange={(adjustmentType) =>
            onChange({
              ...values,
              adjustmentType: adjustmentType as CommercialAdjustmentType,
              agreedAmountMinor:
                adjustmentType === 'COMPLIMENTARY'
                  ? 0
                  : values.agreedAmountMinor,
              adjustmentReason:
                adjustmentType === 'NONE'
                  ? undefined
                  : values.adjustmentReason,
            })
          }
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

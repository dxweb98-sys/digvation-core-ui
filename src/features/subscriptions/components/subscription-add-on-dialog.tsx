import { dateInputToInstant } from '../../../shared/format/date-field';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppCurrencyInput, AppInput, AppSelect } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';
import { useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useMemo, useState } from 'react';
import { useProductAddOns } from '../../commercial-catalog/hooks/use-commercial-catalog';
import type {
  AddOnOffering,
  BillingCycle,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
import {
  formatMoney,
  majorToMinorValue,
  minorToMajorValue,
} from '../../commercial-catalog/utils/money';
import { useAddSubscriptionAddOn } from '../hooks/use-client-commercial';
import type { ClientProductCommercialSummary } from '../types/subscription';

const ADJUSTMENT_OPTIONS = [
  { value: 'NONE', label: 'No adjustment' },
  { value: 'PROMOTIONAL', label: 'Promotional' },
  { value: 'NEGOTIATED', label: 'Negotiated' },
  { value: 'GRANDFATHERED', label: 'Grandfathered' },
  { value: 'COMPLIMENTARY', label: 'Complimentary' },
];

const MONTHS_PER_CYCLE: Partial<Record<BillingCycle, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

function addMonthsClamped(anchor: Date, months: number) {
  const target = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + months,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return target;
}

function previewProration(input: {
  startsAt: string;
  endsAt?: string;
  cycle: BillingCycle;
  effectiveFrom: string;
  amountMinor: number;
}) {
  const monthsPerCycle = MONTHS_PER_CYCLE[input.cycle];
  if (!monthsPerCycle || !input.effectiveFrom) return undefined;
  const anchor = new Date(input.startsAt);
  const effective = new Date(input.effectiveFrom);
  const termEnd = input.endsAt ? new Date(input.endsAt) : undefined;
  if (
    Number.isNaN(anchor.getTime()) ||
    Number.isNaN(effective.getTime()) ||
    effective < anchor
  ) {
    return undefined;
  }
  if (termEnd && effective >= termEnd) return undefined;

  const monthsSinceAnchor =
    (effective.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (effective.getUTCMonth() - anchor.getUTCMonth());
  let index = Math.max(0, Math.floor(monthsSinceAnchor / monthsPerCycle));
  let periodStart = addMonthsClamped(anchor, index * monthsPerCycle);
  if (periodStart > effective) {
    index = Math.max(0, index - 1);
    periodStart = addMonthsClamped(anchor, index * monthsPerCycle);
  }
  let periodEnd = addMonthsClamped(anchor, (index + 1) * monthsPerCycle);
  if (termEnd && periodEnd > termEnd) periodEnd = termEnd;
  while (periodEnd <= effective) {
    index += 1;
    periodStart = periodEnd;
    periodEnd = addMonthsClamped(anchor, (index + 1) * monthsPerCycle);
    if (termEnd && periodEnd > termEnd) periodEnd = termEnd;
  }
  const total = periodEnd.getTime() - periodStart.getTime();
  const remaining = periodEnd.getTime() - effective.getTime();
  if (total <= 0 || remaining <= 0) return undefined;
  return Math.round((input.amountMinor * remaining) / total);
}

export function SubscriptionAddOnDialog({
  summary,
  onClose,
}: {
  summary: ClientProductCommercialSummary;
  onClose: () => void;
}) {
  const offeringsQuery = useProductAddOns(summary.productId);
  const mutation = useAddSubscriptionAddOn();
  const { showToast } = useToast();
  const [offeringId, setOfferingId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [agreedAmountMinor, setAgreedAmountMinor] = useState<
    number | undefined
  >();
  const [adjustmentType, setAdjustmentType] =
    useState<CommercialAdjustmentType>('NONE');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const currentTerm = summary.currentTerm;
  const subscription = summary.subscription;
  const offerings = (offeringsQuery.data ?? []).filter(
    (offering) =>
      offering.status === 'ACTIVE' &&
      !summary.addOns.some(
        (addOn) =>
          addOn.addOnOfferingId === offering.id &&
          (addOn.status === 'ACTIVE' || addOn.status === 'SUSPENDED'),
      ),
  );
  const offering = offerings.find((item) => item.id === offeringId);
  const catalogPrice = useMemo(() => {
    if (!offering || !currentTerm) return undefined;
    return offering.prices.find(
      (price) =>
        price.billingCycle === currentTerm.billingCycle &&
        price.currency === currentTerm.currency,
    );
  }, [currentTerm, offering]);
  const agreed =
    adjustmentType === 'COMPLIMENTARY'
      ? 0
      : agreedAmountMinor ?? catalogPrice?.amountMinor;
  const effectiveInstant = dateInputToInstant(effectiveFrom);
  const prorated =
    currentTerm && agreed !== undefined
      ? previewProration({
          startsAt: currentTerm.startsAt,
          endsAt: currentTerm.endsAt,
          cycle: currentTerm.billingCycle,
          effectiveFrom: effectiveInstant ?? '',
          amountMinor: agreed,
        })
      : undefined;
  const { field, allowSubmit } = useFieldErrors<
    'offeringId' | 'effectiveFrom' | 'agreed' | 'adjustmentReason'
  >('subscription-add-on-form', () => {
    const errors: Partial<
      Record<'offeringId' | 'effectiveFrom' | 'agreed' | 'adjustmentReason', string>
    > = {};
    if (!offering) errors.offeringId = 'Select an add-on.';
    else if (!catalogPrice) {
      errors.offeringId = 'This add-on has no price for the subscription billing cycle.';
    }
    if (!effectiveFrom.trim()) errors.effectiveFrom = 'Enter a start date.';
    else if (!effectiveInstant) errors.effectiveFrom = 'Use the format YYYY-MM-DD.';
    else if (catalogPrice && prorated === undefined) {
      errors.effectiveFrom = 'Choose a valid start date.';
    }
    if (agreed === undefined || !Number.isSafeInteger(agreed) || agreed < 0) {
      errors.agreed = 'Enter an amount of 0 or more.';
    } else if (
      catalogPrice &&
      adjustmentType === 'NONE' &&
      agreed !== catalogPrice.amountMinor
    ) {
      errors.agreed = 'Choose an adjustment to change the price.';
    } else if (adjustmentType === 'COMPLIMENTARY' && agreed !== 0) {
      errors.agreed = 'A complimentary price must be 0.';
    }
    if (adjustmentType !== 'NONE' && !adjustmentReason.trim()) {
      errors.adjustmentReason = 'Enter a reason for the adjustment.';
    }
    return errors;
  });

  if (!subscription || !currentTerm) return null;
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
    return (
      <AppDialog kind="form"
        open
        onClose={onClose}
        title={`Add add-on to ${summary.productName}`}
        description="Add-ons need a subscription in trial or active status."
        footer={<AppAction onClick={onClose}>Close</AppAction>}
      />
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!allowSubmit() || !offering || !catalogPrice || agreed === undefined || !effectiveInstant) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: subscription.id,
        addOnOfferingId: offering.id,
        effectiveFrom: effectiveInstant,
        agreedAmountMinor: agreed,
        adjustmentType,
        adjustmentReason:
          adjustmentType === 'NONE' ? undefined : adjustmentReason.trim(),
      });
      showToast({ title: 'Add-on activated', variant: 'success' });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The add-on could not be activated.');
      showToast({
        title: 'Add-on activation failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <AppDialog kind="form"
      open
      onClose={onClose}
      title={`Add add-on to ${summary.productName}`}
      description="The add-on starts on this date and ends with the subscription term."
      footer={
        <div className="client-dialog-actions">
          <AppAction tone="secondary" onClick={onClose}>
            Cancel
          </AppAction>
          <AppAction
            form="subscription-add-on-form"
            type="submit"
            loading={mutation.isPending}
          >
            Activate
          </AppAction>
        </div>
      }
    >
      <form
        id="subscription-add-on-form"
        className="client-contact-form"
        onSubmit={submit}
      >
        <AppSelect
          {...field('offeringId')}
          label="Add-on offering" placeholder="Select an add-on"
          value={offeringId}
          options={offerings.map((item: AddOnOffering) => ({
            value: item.id,
            label: `${item.name} (${item.code})`,
          }))}
          clearable={false}
          onValueChange={(value) => {
            if (typeof value !== 'string') return;
            setOfferingId(value);
            setAgreedAmountMinor(undefined);
            setAdjustmentType('NONE');
            setAdjustmentReason('');
          }}
        />
        <AppInput
          {...field('effectiveFrom')}
          label="Effective from"
          placeholder="YYYY-MM-DD"
          value={effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <div className="client-commercial-price-context">
          <span>List price</span>
          <strong>
            {catalogPrice
              ? formatMoney(catalogPrice.amountMinor, catalogPrice.currency)
              : offering
                ? 'No matching price for the current subscription cycle'
                : 'Select an add-on'}
          </strong>
        </div>
        <div className="client-form-grid">
          <AppCurrencyInput
            {...field('agreed')}
            label="Agreed recurring price" placeholder="150,000"
            value={agreed === undefined ? '' : minorToMajorValue(agreed)}
            currencySymbol={currentTerm.currency}
            disabled={
              !catalogPrice ||
              adjustmentType === 'NONE' ||
              adjustmentType === 'COMPLIMENTARY'
            }
            onValueChange={(amount) =>
              setAgreedAmountMinor(majorToMinorValue(amount))
            }
          />
          <AppSelect
            label="Adjustment" placeholder="Select an adjustment"
            value={adjustmentType}
            options={ADJUSTMENT_OPTIONS}
            clearable={false}
            onValueChange={(value) => {
              if (typeof value !== 'string') return;
              const next = value as CommercialAdjustmentType;
              setAdjustmentType(next);
              if (next === 'NONE') {
                setAgreedAmountMinor(undefined);
                setAdjustmentReason('');
              } else if (next === 'COMPLIMENTARY') {
                setAgreedAmountMinor(0);
              } else if (adjustmentType === 'COMPLIMENTARY') {
                setAgreedAmountMinor(undefined);
              }
            }}
          />
        </div>
        {adjustmentType !== 'NONE' ? (
          <AppInput
            {...field('adjustmentReason')}
            label="Adjustment reason" placeholder="Annual contract discount"
            value={adjustmentReason}
            maxLength={500}
            onChange={setAdjustmentReason}
          />
        ) : null}
        <div className="client-commercial-proration-preview">
          <span>Initial prorated charge</span>
          <strong>
            {prorated === undefined
              ? currentTerm.billingCycle === 'CUSTOM'
                ? 'Custom billing cycles do not support automatic add-on proration'
                : 'Choose a valid start date'
              : formatMoney(prorated, currentTerm.currency)}
          </strong>
          <small>
            Later periods use the agreed recurring price.
          </small>
        </div>
        {submitError ? <p className="client-commercial-form-error" role="alert">{submitError}</p> : null}
      </form>
    </AppDialog>
  );
}

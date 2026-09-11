import {
  DButton,
  DCurrencyInput,
  DDialog,
  DInput,
  DSelect,
  useToast,
} from '@digvation/ui';
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
  const effective = new Date(`${input.effectiveFrom}T00:00:00.000Z`);
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
  const prorated =
    currentTerm && agreed !== undefined
      ? previewProration({
          startsAt: currentTerm.startsAt,
          endsAt: currentTerm.endsAt,
          cycle: currentTerm.billingCycle,
          effectiveFrom,
          amountMinor: agreed,
        })
      : undefined;
  const adjustedReasonValid =
    adjustmentType === 'NONE' || Boolean(adjustmentReason.trim());
  const canSubmit = Boolean(
    offering &&
      catalogPrice &&
      effectiveFrom &&
      agreed !== undefined &&
      Number.isSafeInteger(agreed) &&
      agreed >= 0 &&
      prorated !== undefined &&
      adjustedReasonValid &&
      (adjustmentType !== 'NONE' || agreed === catalogPrice.amountMinor) &&
      (adjustmentType !== 'COMPLIMENTARY' || agreed === 0),
  );

  if (!subscription || !currentTerm) return null;
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
    return (
      <DDialog
        open
        onClose={onClose}
        title={`Add commercial add-on · ${summary.productName}`}
        description="Add-ons can only be activated while the parent subscription is in trial or active state."
        footer={<DButton onClick={onClose}>Close</DButton>}
      />
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!offering || !catalogPrice || agreed === undefined || !canSubmit) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: subscription.id,
        addOnOfferingId: offering.id,
        effectiveFrom: `${effectiveFrom}T00:00:00.000Z`,
        agreedAmountMinor: agreed,
        adjustmentType,
        adjustmentReason:
          adjustmentType === 'NONE' ? undefined : adjustmentReason.trim(),
      });
      showToast({ title: 'Add-on activated', variant: 'success' });
      onClose();
    } catch (error) {
      showToast({
        title: 'Add-on activation failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open
      onClose={onClose}
      title={`Add commercial add-on · ${summary.productName}`}
      description="The add-on starts on the selected date, co-terms with the Product subscription, and its first billing period is prorated."
      size="lg"
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>
            Cancel
          </DButton>
          <DButton
            form="subscription-add-on-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!canSubmit}
          >
            Activate Add-on
          </DButton>
        </div>
      }
    >
      <form
        id="subscription-add-on-form"
        className="client-contact-form"
        onSubmit={submit}
      >
        <DSelect
          label="Add-on Offering *"
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
        <DInput
          label="Effective From *"
          placeholder="YYYY-MM-DD"
          value={effectiveFrom}
          onChange={setEffectiveFrom}
        />
        <div className="client-commercial-price-context">
          <span>Recurring list price</span>
          <strong>
            {catalogPrice
              ? formatMoney(catalogPrice.amountMinor, catalogPrice.currency)
              : offering
                ? 'No matching price for the current subscription cycle'
                : 'Select an add-on'}
          </strong>
        </div>
        <div className="client-form-grid">
          <DCurrencyInput
            label="Agreed Recurring Price *"
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
          <DSelect
            label="Adjustment *"
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
          <DInput
            label="Adjustment Reason *"
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
                : 'Choose a valid effective date'
              : formatMoney(prorated, currentTerm.currency)}
          </strong>
          <small>
            Recurring periods after the first charge use the agreed recurring price above.
          </small>
        </div>
      </form>
    </DDialog>
  );
}

import { DButton, DDialog, DInput, DSelect, useToast } from '@digvation/ui';
import { useMemo, useState } from 'react';
import { useProductAddOns } from '../../commercial-catalog/hooks/use-commercial-catalog';
import type {
  AddOnOffering,
  BillingCycle,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
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

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function addMonthsClamped(anchor: Date, months: number) {
  const target = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + months,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
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
  if (Number.isNaN(effective.getTime()) || effective < anchor) return undefined;
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
  const [agreedAmountMinor, setAgreedAmountMinor] = useState<number | undefined>();
  const [adjustmentType, setAdjustmentType] =
    useState<CommercialAdjustmentType>('NONE');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const currentTerm = summary.currentTerm;
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

  if (!summary.subscription || !currentTerm) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !summary.subscription ||
      !offering ||
      !effectiveFrom ||
      !catalogPrice ||
      agreed === undefined
    ) {
      return;
    }
    if (adjustmentType !== 'NONE' && !adjustmentReason.trim()) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: summary.subscription.id,
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
          <DButton variant="outline" onClick={onClose}>Cancel</DButton>
          <DButton
            form="subscription-add-on-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!offering || !catalogPrice || prorated === undefined}
          >
            Activate Add-on
          </DButton>
        </div>
      }
    >
      <form id="subscription-add-on-form" className="client-contact-form" onSubmit={submit}>
        <DSelect
          label="Add-on Offering *"
          value={offeringId}
          options={offerings.map((item: AddOnOffering) => ({
            value: item.id,
            label: `${item.name} (${item.code})`,
          }))}
          onValueChange={(value) => {
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
              ? money(catalogPrice.amountMinor, catalogPrice.currency)
              : offering
                ? 'No matching price for the current subscription cycle'
                : 'Select an add-on'}
          </strong>
        </div>
        <div className="client-form-grid">
          <DInput
            label="Agreed Recurring Price *"
            type="number"
            disabled={!catalogPrice || adjustmentType === 'COMPLIMENTARY'}
            value={agreed === undefined ? '' : String(agreed / 100)}
            onChange={(amount) =>
              setAgreedAmountMinor(Math.max(0, Number(amount || 0) * 100))
            }
          />
          <DSelect
            label="Adjustment *"
            value={adjustmentType}
            options={ADJUSTMENT_OPTIONS}
            onValueChange={(value) => {
              const next = value as CommercialAdjustmentType;
              setAdjustmentType(next);
              if (next === 'NONE') {
                setAgreedAmountMinor(undefined);
                setAdjustmentReason('');
              }
              if (next === 'COMPLIMENTARY') setAgreedAmountMinor(0);
            }}
          />
        </div>
        {adjustmentType !== 'NONE' ? (
          <DInput
            label="Adjustment Reason *"
            value={adjustmentReason}
            onChange={setAdjustmentReason}
          />
        ) : null}
        <div className="client-commercial-proration-preview">
          <span>Initial prorated charge</span>
          <strong>
            {prorated === undefined
              ? currentTerm.billingCycle === 'CUSTOM'
                ? 'Custom cycles require an explicit billing anchor'
                : 'Choose a valid effective date'
              : money(prorated, currentTerm.currency)}
          </strong>
          <small>
            Recurring periods after the first charge use the agreed recurring price above.
          </small>
        </div>
      </form>
    </DDialog>
  );
}

import { DButton, DDialog, DInput, DToggle, useToast } from '@digvation/ui';
import { useState } from 'react';
import { useProductPrices } from '../../commercial-catalog/hooks/use-commercial-catalog';
import type { CatalogPrice } from '../../commercial-catalog/types/commercial-catalog';
import { CommercialTermFields, findCatalogPrice } from './commercial-term-fields';
import {
  useAddRenewalTerm,
  useCreateInitialSubscription,
} from '../hooks/use-client-commercial';
import type {
  ClientProductCommercialSummary,
  CommercialTermInput,
  InitialSubscriptionInput,
  RenewalTermInput,
} from '../types/subscription';

function baseTerm(): CommercialTermInput {
  return {
    startsAt: '',
    endsAt: '',
    billingCycle: 'MONTHLY',
    currency: 'IDR',
    adjustmentType: 'NONE',
    paymentTermsDays: 30,
  };
}

function validDayCount(value: number | undefined) {
  return (
    value === undefined ||
    (Number.isInteger(value) && value >= 0 && value <= 365)
  );
}

function canSubmitTerm(
  values: CommercialTermInput,
  catalogPrice: CatalogPrice | undefined,
) {
  if (!values.startsAt || !catalogPrice) return false;
  const startsAt = new Date(values.startsAt);
  const endsAt = values.endsAt ? new Date(values.endsAt) : undefined;
  if (Number.isNaN(startsAt.getTime())) return false;
  if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt)) {
    return false;
  }
  if (!validDayCount(values.paymentTermsDays)) return false;

  const agreedAmountMinor =
    values.agreedAmountMinor ?? catalogPrice.amountMinor;
  if (
    !Number.isSafeInteger(agreedAmountMinor) ||
    agreedAmountMinor < 0 ||
    (values.adjustmentType === 'NONE' &&
      agreedAmountMinor !== catalogPrice.amountMinor) ||
    (values.adjustmentType === 'COMPLIMENTARY' && agreedAmountMinor !== 0)
  ) {
    return false;
  }
  if (
    values.adjustmentType !== 'NONE' &&
    !values.adjustmentReason?.trim()
  ) {
    return false;
  }
  return true;
}

function canSubmitInitial(
  values: InitialSubscriptionInput,
  catalogPrice: CatalogPrice | undefined,
) {
  return (
    canSubmitTerm(values, catalogPrice) &&
    validDayCount(values.renewalNoticeDays) &&
    validDayCount(values.gracePeriodDays) &&
    (values.contractReference?.length ?? 0) <= 150
  );
}

function UnavailableRenewalDialog({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <DDialog
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={<DButton onClick={onClose}>Close</DButton>}
    />
  );
}

export function InitialSubscriptionDialog({
  summary,
  clientId,
  onClose,
}: {
  summary: ClientProductCommercialSummary;
  clientId: string;
  onClose: () => void;
}) {
  const mutation = useCreateInitialSubscription();
  const pricesQuery = useProductPrices(summary.productId);
  const { showToast } = useToast();
  const [values, setValues] = useState<InitialSubscriptionInput>({
    ...baseTerm(),
    clientProductId: summary.clientProductId,
    clientId,
    productId: summary.productId,
    productName: summary.productName,
    productCode: summary.productCode,
    autoRenew: false,
    renewalNoticeDays: 30,
    gracePeriodDays: undefined,
    contractReference: '',
  });
  const prices = pricesQuery.data ?? [];
  const catalogPrice = findCatalogPrice(prices, values);
  const submittable = canSubmitInitial(values, catalogPrice);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!submittable) return;
    try {
      await mutation.mutateAsync({
        ...values,
        agreedAmountMinor: values.agreedAmountMinor ?? catalogPrice?.amountMinor,
      });
      showToast({ title: 'Subscription configured', variant: 'success' });
      onClose();
    } catch (error) {
      showToast({
        title: 'Subscription setup failed',
        description:
          error instanceof Error
            ? error.message
            : 'Check the commercial term values.',
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open
      onClose={onClose}
      title={`Set up ${summary.productName} subscription`}
      description="The first term snapshots both the current Product list price and the Client-agreed price."
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>
            Cancel
          </DButton>
          <DButton
            form="initial-subscription-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!submittable}
          >
            Set Up Subscription
          </DButton>
        </div>
      }
    >
      <form
        id="initial-subscription-form"
        className="client-contact-form"
        onSubmit={submit}
      >
        <CommercialTermFields
          values={values}
          prices={prices}
          onChange={(next) =>
            setValues((current) => ({ ...current, ...next }))
          }
        />
        <div className="client-form-grid">
          <DToggle
            label="Auto renew"
            checked={values.autoRenew}
            onChange={(autoRenew) =>
              setValues((current) => ({ ...current, autoRenew }))
            }
          />
          <DInput
            label="Renewal Notice (days) *"
            type="number"
            value={String(values.renewalNoticeDays)}
            onChange={(renewalNoticeDays) =>
              setValues((current) => ({
                ...current,
                renewalNoticeDays: Number(renewalNoticeDays || 0),
              }))
            }
          />
        </div>
        <div className="client-form-grid">
          <DInput
            label="Grace Period (days)"
            type="number"
            value={String(values.gracePeriodDays ?? '')}
            onChange={(gracePeriodDays) =>
              setValues((current) => ({
                ...current,
                gracePeriodDays: gracePeriodDays
                  ? Number(gracePeriodDays)
                  : undefined,
              }))
            }
          />
          <DInput
            label="Contract Reference"
            value={values.contractReference ?? ''}
            maxLength={150}
            onChange={(contractReference) =>
              setValues((current) => ({ ...current, contractReference }))
            }
          />
        </div>
      </form>
    </DDialog>
  );
}

export function RenewalDialog({
  summary,
  onClose,
}: {
  summary: ClientProductCommercialSummary;
  onClose: () => void;
}) {
  const mutation = useAddRenewalTerm();
  const pricesQuery = useProductPrices(summary.productId);
  const { showToast } = useToast();
  const renewalAnchor = summary.latestTerm ?? summary.currentTerm;
  const subscription = summary.subscription;
  const hasLiveAddOns = summary.addOns.some(
    (addOn) => addOn.status === 'ACTIVE' || addOn.status === 'SUSPENDED',
  );
  const [values, setValues] = useState<RenewalTermInput>(() => ({
    ...baseTerm(),
    startsAt: renewalAnchor?.endsAt ?? '',
    billingCycle: renewalAnchor?.billingCycle ?? 'MONTHLY',
    currency: renewalAnchor?.currency ?? 'IDR',
  }));
  const prices = pricesQuery.data ?? [];
  const catalogPrice = findCatalogPrice(prices, values);
  const submittable = canSubmitTerm(values, catalogPrice);

  if (!subscription || !renewalAnchor) return null;
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return (
      <UnavailableRenewalDialog
        title={`Renew ${summary.productName}`}
        description="This subscription is terminal. Create a new commercial subscription instead of extending a cancelled or expired contract."
        onClose={onClose}
      />
    );
  }
  if (!renewalAnchor.endsAt) {
    return (
      <UnavailableRenewalDialog
        title={`Renew ${summary.productName}`}
        description="The latest scheduled term is open-ended, so there is no renewal boundary yet."
        onClose={onClose}
      />
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!submittable) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: subscription.id,
        input: {
          ...values,
          agreedAmountMinor: values.agreedAmountMinor ?? catalogPrice?.amountMinor,
        },
      });
      showToast({ title: 'Renewal term added', variant: 'success' });
      onClose();
    } catch (error) {
      showToast({
        title: 'Renewal could not be added',
        description:
          error instanceof Error ? error.message : 'Check the term dates.',
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open
      onClose={onClose}
      title={`Renew ${summary.productName}`}
      description={
        hasLiveAddOns
          ? 'Live add-ons remain co-termed. This renewal must start when the latest scheduled term ends and keep its billing cycle and currency. Cancel the existing add-on first if its commercial basis needs to change.'
          : 'Renewal snapshots the list price available now and the newly agreed Client price without rewriting previous terms.'
      }
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>
            Cancel
          </DButton>
          <DButton
            form="renewal-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!submittable}
          >
            Add Renewal
          </DButton>
        </div>
      }
    >
      <form
        id="renewal-form"
        className="client-contact-form"
        onSubmit={submit}
      >
        <CommercialTermFields
          values={values}
          prices={prices}
          onChange={setValues}
          lockStart={hasLiveAddOns}
          lockBillingBasis={hasLiveAddOns}
        />
      </form>
    </DDialog>
  );
}

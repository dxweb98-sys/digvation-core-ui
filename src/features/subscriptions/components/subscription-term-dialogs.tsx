import { dateInputToInstant, instantToDateInput } from '../../../shared/format/date-field';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';
import { DToggle, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useProductPrices } from '../../commercial-catalog/hooks/use-commercial-catalog';
import type { CatalogPrice } from '../../commercial-catalog/types/commercial-catalog';
import { CommercialTermFields, findCatalogPrice } from './commercial-term-fields';
import type { TermField } from './commercial-term-fields';
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

const DAY_COUNT_ERROR = 'Use a whole number from 0 to 365.';

function termErrors(
  values: CommercialTermInput,
  catalogPrice: CatalogPrice | undefined,
  originalStartsAt?: string,
) {
  const errors: Partial<Record<TermField, string>> = {};
  const startsAt = dateInputToInstant(values.startsAt, originalStartsAt);
  const endsAt = dateInputToInstant(values.endsAt);
  if (!values.startsAt?.trim()) errors.startsAt = 'Enter a start date.';
  else if (!startsAt) errors.startsAt = 'Use the format YYYY-MM-DD.';
  if (values.endsAt?.trim() && !endsAt) {
    errors.endsAt = 'Use the format YYYY-MM-DD.';
  } else if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) {
    errors.endsAt = 'The end date must be after the start date.';
  }
  if (!validDayCount(values.paymentTermsDays)) {
    errors.paymentTermsDays = DAY_COUNT_ERROR;
  }
  if (!catalogPrice) {
    errors.currency = 'Set a list price for this billing cycle and currency first.';
    return errors;
  }
  const agreedAmountMinor =
    values.agreedAmountMinor ?? catalogPrice.amountMinor;
  if (!Number.isSafeInteger(agreedAmountMinor) || agreedAmountMinor < 0) {
    errors.agreedAmountMinor = 'Enter an amount of 0 or more.';
  } else if (
    values.adjustmentType === 'NONE' &&
    agreedAmountMinor !== catalogPrice.amountMinor
  ) {
    errors.agreedAmountMinor = 'Choose an adjustment to change the price.';
  } else if (
    values.adjustmentType === 'COMPLIMENTARY' &&
    agreedAmountMinor !== 0
  ) {
    errors.agreedAmountMinor = 'A complimentary price must be 0.';
  }
  if (values.adjustmentType !== 'NONE' && !values.adjustmentReason?.trim()) {
    errors.adjustmentReason = 'Enter a reason for the adjustment.';
  }
  return errors;
}

type InitialField = TermField | 'renewalNoticeDays' | 'gracePeriodDays';

function initialErrors(
  values: InitialSubscriptionInput,
  catalogPrice: CatalogPrice | undefined,
) {
  const errors: Partial<Record<InitialField, string>> = termErrors(
    values,
    catalogPrice,
  );
  if (!validDayCount(values.renewalNoticeDays)) {
    errors.renewalNoticeDays = DAY_COUNT_ERROR;
  }
  if (!validDayCount(values.gracePeriodDays)) {
    errors.gracePeriodDays = DAY_COUNT_ERROR;
  }
  return errors;
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
    <AppDialog kind="form"
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={<AppAction onClick={onClose}>Close</AppAction>}
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
  const [submitError, setSubmitError] = useState('');
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
  const { field, allowSubmit } = useFieldErrors<InitialField>(
    'initial-subscription-form',
    () => initialErrors(values, catalogPrice),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!allowSubmit()) return;
    try {
      await mutation.mutateAsync({
        ...values,
        startsAt: dateInputToInstant(values.startsAt) as string,
        endsAt: dateInputToInstant(values.endsAt),
        agreedAmountMinor: values.agreedAmountMinor ?? catalogPrice?.amountMinor,
      });
      showToast({ title: 'Subscription configured', variant: 'success' });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Check the commercial term values.');
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
    <AppDialog kind="form"
      open
      onClose={onClose}
      title={`Set up ${summary.productName} subscription`}
      footer={
        <div className="client-dialog-actions">
          <AppAction tone="secondary" onClick={onClose}>
            Cancel
          </AppAction>
          <AppAction
            form="initial-subscription-form"
            type="submit"
            loading={mutation.isPending}
          >
            Set up
          </AppAction>
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
          field={field}
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
          <AppInput
            {...field('renewalNoticeDays')}
            label="Renewal notice (days)" placeholder="30"
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
          <AppInput
            {...field('gracePeriodDays')}
            label="Grace period (days)" placeholder="14" optional
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
          <AppInput
            label="Contract reference" placeholder="CTR-2026-014" optional
            value={values.contractReference ?? ''}
            maxLength={150}
            onChange={(contractReference) =>
              setValues((current) => ({ ...current, contractReference }))
            }
          />
        </div>
        {submitError ? <p className="client-commercial-form-error" role="alert">{submitError}</p> : null}
      </form>
    </AppDialog>
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
  const [submitError, setSubmitError] = useState('');
  const renewalAnchor = summary.latestTerm ?? summary.currentTerm;
  const subscription = summary.subscription;
  const hasLiveAddOns = summary.addOns.some(
    (addOn) => addOn.status === 'ACTIVE' || addOn.status === 'SUSPENDED',
  );
  const [values, setValues] = useState<RenewalTermInput>(() => ({
    ...baseTerm(),
    startsAt: instantToDateInput(renewalAnchor?.endsAt),
    billingCycle: renewalAnchor?.billingCycle ?? 'MONTHLY',
    currency: renewalAnchor?.currency ?? 'IDR',
  }));
  const prices = pricesQuery.data ?? [];
  const catalogPrice = findCatalogPrice(prices, values);
  const { field, allowSubmit } = useFieldErrors<TermField>('renewal-form', () =>
    termErrors(values, catalogPrice, renewalAnchor?.endsAt),
  );

  if (!subscription || !renewalAnchor) return null;
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return (
      <UnavailableRenewalDialog
        title={`Renew ${summary.productName}`}
        description="This subscription has ended. Create a new one instead."
        onClose={onClose}
      />
    );
  }
  if (!renewalAnchor.endsAt) {
    return (
      <UnavailableRenewalDialog
        title={`Renew ${summary.productName}`}
        description="The latest term has no end date, so it cannot be renewed yet."
        onClose={onClose}
      />
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!allowSubmit()) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: subscription.id,
        input: {
          ...values,
          startsAt: dateInputToInstant(values.startsAt, renewalAnchor?.endsAt) as string,
          endsAt: dateInputToInstant(values.endsAt),
          agreedAmountMinor: values.agreedAmountMinor ?? catalogPrice?.amountMinor,
        },
      });
      showToast({ title: 'Renewal term added', variant: 'success' });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Check the term dates.');
      showToast({
        title: 'Renewal could not be added',
        description:
          error instanceof Error ? error.message : 'Check the term dates.',
        variant: 'danger',
      });
    }
  }

  return (
    <AppDialog kind="form"
      open
      onClose={onClose}
      title={`Renew ${summary.productName}`}
      footer={
        <div className="client-dialog-actions">
          <AppAction tone="secondary" onClick={onClose}>
            Cancel
          </AppAction>
          <AppAction
            form="renewal-form"
            type="submit"
            loading={mutation.isPending}
          >
            Renew
          </AppAction>
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
          field={field}
          prices={prices}
          onChange={setValues}
          lockStart={hasLiveAddOns}
          lockBillingBasis={hasLiveAddOns}
        />
        {submitError ? <p className="client-commercial-form-error" role="alert">{submitError}</p> : null}
      </form>
    </AppDialog>
  );
}

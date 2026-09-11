import { DButton, DDialog, DInput, DToggle, useToast } from '@digvation/ui';
import { useState } from 'react';
import { useProductPrices } from '../../commercial-catalog/hooks/use-commercial-catalog';
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

function canSubmit(values: CommercialTermInput, hasPrice: boolean) {
  if (!values.startsAt || !hasPrice) return false;
  if (values.endsAt && values.endsAt <= values.startsAt) return false;
  if (values.adjustmentType !== 'NONE' && !values.adjustmentReason?.trim()) {
    return false;
  }
  return true;
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit(values, Boolean(catalogPrice))) return;
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
          error instanceof Error ? error.message : 'Check the commercial term values.',
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
          <DButton variant="outline" onClick={onClose}>Cancel</DButton>
          <DButton
            form="initial-subscription-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!canSubmit(values, Boolean(catalogPrice))}
          >
            Set Up Subscription
          </DButton>
        </div>
      }
    >
      <form id="initial-subscription-form" className="client-contact-form" onSubmit={submit}>
        <CommercialTermFields values={values} prices={prices} onChange={(next) => setValues((current) => ({ ...current, ...next }))} />
        <div className="client-form-grid">
          <DToggle
            label="Auto renew"
            checked={values.autoRenew}
            onChange={(autoRenew) => setValues((current) => ({ ...current, autoRenew }))}
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
                gracePeriodDays: gracePeriodDays ? Number(gracePeriodDays) : undefined,
              }))
            }
          />
          <DInput
            label="Contract Reference"
            value={values.contractReference ?? ''}
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
  const [values, setValues] = useState<RenewalTermInput>(baseTerm());
  const prices = pricesQuery.data ?? [];
  const catalogPrice = findCatalogPrice(prices, values);
  if (!summary.subscription) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!summary.subscription || !canSubmit(values, Boolean(catalogPrice))) return;
    try {
      await mutation.mutateAsync({
        subscriptionId: summary.subscription.id,
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
        description: error instanceof Error ? error.message : 'Check the term dates.',
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open
      onClose={onClose}
      title={`Renew ${summary.productName}`}
      description="Renewal snapshots the list price available now and the newly agreed Client price without rewriting previous terms."
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>Cancel</DButton>
          <DButton
            form="renewal-form"
            type="submit"
            loading={mutation.isPending}
            disabled={!canSubmit(values, Boolean(catalogPrice))}
          >
            Add Renewal
          </DButton>
        </div>
      }
    >
      <form id="renewal-form" className="client-contact-form" onSubmit={submit}>
        <CommercialTermFields values={values} prices={prices} onChange={setValues} />
      </form>
    </DDialog>
  );
}

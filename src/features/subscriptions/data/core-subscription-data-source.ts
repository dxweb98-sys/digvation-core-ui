import { coreApiRequest } from '../../../shared/http/core-api-client';
import type { SubscriptionDataSource } from './subscription-data-source';
import type {
  ClientProductCommercialSummary,
  Subscription,
  SubscriptionAddOn,
  SubscriptionTerm,
} from '../types/subscription';

interface CoreSubscriptionTerm {
  id: string;
  subscription_id: string;
  starts_at: string;
  ends_at: string | null;
  billing_cycle: SubscriptionTerm['billingCycle'];
  currency: string;
  list_amount_minor: number;
  agreed_amount_minor: number;
  adjustment_type: SubscriptionTerm['adjustmentType'];
  adjustment_reason: string | null;
  payment_terms_days: number | null;
  renewed_from_term_id: string | null;
  created_at: string;
}

interface CoreSubscriptionAddOn {
  id: string;
  subscription_id: string;
  add_on_offering_id: string;
  add_on_code: string;
  add_on_name: string;
  status: SubscriptionAddOn['status'];
  effective_from: string;
  effective_until: string | null;
  billing_cycle: SubscriptionAddOn['billingCycle'];
  currency: string;
  list_amount_minor: number;
  agreed_amount_minor: number;
  initial_prorated_amount_minor: number;
  adjustment_type: SubscriptionAddOn['adjustmentType'];
  adjustment_reason: string | null;
  proration_policy: SubscriptionAddOn['prorationPolicy'];
  created_at: string;
  updated_at: string;
}

interface CoreSubscription {
  id: string;
  client_product_id: string;
  status: Subscription['status'];
  auto_renew: boolean;
  renewal_notice_days: number;
  grace_period_days: number | null;
  contract_reference: string | null;
  terms: CoreSubscriptionTerm[];
  current_term: CoreSubscriptionTerm | null;
  latest_term: CoreSubscriptionTerm | null;
  add_ons: CoreSubscriptionAddOn[];
  created_at: string;
  updated_at: string;
}

interface CoreCommercialProduct {
  client_product_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  subscription: CoreSubscription | null;
}

function mapTerm(item: CoreSubscriptionTerm): SubscriptionTerm {
  return {
    id: item.id,
    subscriptionId: item.subscription_id,
    startsAt: item.starts_at,
    endsAt: item.ends_at ?? undefined,
    billingCycle: item.billing_cycle,
    currency: item.currency,
    listAmountMinor: item.list_amount_minor,
    agreedAmountMinor: item.agreed_amount_minor,
    adjustmentType: item.adjustment_type,
    adjustmentReason: item.adjustment_reason ?? undefined,
    paymentTermsDays: item.payment_terms_days ?? undefined,
    renewedFromTermId: item.renewed_from_term_id ?? undefined,
    createdAt: item.created_at,
  };
}

function mapAddOn(item: CoreSubscriptionAddOn): SubscriptionAddOn {
  return {
    id: item.id,
    subscriptionId: item.subscription_id,
    addOnOfferingId: item.add_on_offering_id,
    addOnCode: item.add_on_code,
    addOnName: item.add_on_name,
    status: item.status,
    effectiveFrom: item.effective_from,
    effectiveUntil: item.effective_until ?? undefined,
    billingCycle: item.billing_cycle,
    currency: item.currency,
    listAmountMinor: item.list_amount_minor,
    agreedAmountMinor: item.agreed_amount_minor,
    initialProratedAmountMinor: item.initial_prorated_amount_minor,
    adjustmentType: item.adjustment_type,
    adjustmentReason: item.adjustment_reason ?? undefined,
    prorationPolicy: item.proration_policy,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapSubscription(item: CoreSubscription): Subscription {
  return {
    id: item.id,
    clientProductId: item.client_product_id,
    status: item.status,
    autoRenew: item.auto_renew,
    renewalNoticeDays: item.renewal_notice_days,
    gracePeriodDays: item.grace_period_days ?? undefined,
    contractReference: item.contract_reference ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapSummary(item: CoreCommercialProduct): ClientProductCommercialSummary {
  const subscription = item.subscription;
  return {
    clientProductId: item.client_product_id,
    productId: item.product_id,
    productName: item.product_name,
    productCode: item.product_code,
    subscription: subscription ? mapSubscription(subscription) : undefined,
    currentTerm: subscription?.current_term
      ? mapTerm(subscription.current_term)
      : undefined,
    latestTerm: subscription?.latest_term
      ? mapTerm(subscription.latest_term)
      : undefined,
    terms: subscription?.terms.map(mapTerm) ?? [],
    addOns: subscription?.add_ons.map(mapAddOn) ?? [],
    configurations: [],
  };
}

const addOnSubscriptionIds = new Map<string, string>();

async function getSubscription(subscriptionId: string) {
  const subscription = await coreApiRequest<CoreSubscription>(
    `/subscriptions/${subscriptionId}`,
  );
  for (const addOn of subscription.add_ons) {
    addOnSubscriptionIds.set(addOn.id, subscription.id);
  }
  return subscription;
}

export const coreSubscriptionDataSource: SubscriptionDataSource = {
  async getClientCommercialSummary(clientId) {
    const response = await coreApiRequest<{ items: CoreCommercialProduct[] }>(
      `/clients/${clientId}/commercial`,
    );
    for (const item of response.items) {
      for (const addOn of item.subscription?.add_ons ?? []) {
        addOnSubscriptionIds.set(addOn.id, addOn.subscription_id);
      }
    }
    return response.items.map(mapSummary);
  },

  async createInitialSubscription(input) {
    const response = await coreApiRequest<{ subscription_id: string }>(
      `/client-products/${input.clientProductId}/subscription`,
      {
        method: 'POST',
        body: {
          starts_at: input.startsAt,
          ends_at: input.endsAt || undefined,
          billing_cycle: input.billingCycle,
          currency: input.currency,
          agreed_amount_minor: input.agreedAmountMinor,
          adjustment_type: input.adjustmentType,
          adjustment_reason: input.adjustmentReason?.trim() || undefined,
          auto_renew: input.autoRenew,
          renewal_notice_days: input.renewalNoticeDays,
          grace_period_days: input.gracePeriodDays,
          contract_reference: input.contractReference?.trim() || undefined,
          payment_terms_days: input.paymentTermsDays,
        },
      },
    );
    return mapSubscription(await getSubscription(response.subscription_id));
  },

  async addRenewalTerm(subscriptionId, input) {
    const response = await coreApiRequest<{ subscription_term_id: string }>(
      `/subscriptions/${subscriptionId}/terms`,
      {
        method: 'POST',
        body: {
          starts_at: input.startsAt,
          ends_at: input.endsAt || undefined,
          billing_cycle: input.billingCycle,
          currency: input.currency,
          agreed_amount_minor: input.agreedAmountMinor,
          adjustment_type: input.adjustmentType,
          adjustment_reason: input.adjustmentReason?.trim() || undefined,
          payment_terms_days: input.paymentTermsDays,
        },
      },
    );
    const subscription = await getSubscription(subscriptionId);
    const term = subscription.terms.find(
      (item) => item.id === response.subscription_term_id,
    );
    if (!term) throw new Error('Renewal term was not found after the operation.');
    return mapTerm(term);
  },

  async addSubscriptionAddOn(input) {
    const response = await coreApiRequest<{ subscription_add_on_id: string }>(
      `/subscriptions/${input.subscriptionId}/add-ons`,
      {
        method: 'POST',
        body: {
          add_on_offering_id: input.addOnOfferingId,
          effective_from: input.effectiveFrom,
          agreed_amount_minor: input.agreedAmountMinor,
          adjustment_type: input.adjustmentType,
          adjustment_reason: input.adjustmentReason?.trim() || undefined,
        },
      },
    );
    addOnSubscriptionIds.set(response.subscription_add_on_id, input.subscriptionId);
    const subscription = await getSubscription(input.subscriptionId);
    const addOn = subscription.add_ons.find(
      (item) => item.id === response.subscription_add_on_id,
    );
    if (!addOn) throw new Error('Subscription add-on was not found after the operation.');
    return mapAddOn(addOn);
  },

  async transitionSubscriptionAddOn(subscriptionAddOnId, targetStatus, reason) {
    await coreApiRequest(`/subscription-add-ons/${subscriptionAddOnId}/status`, {
      method: 'PATCH',
      body: { target_status: targetStatus, reason },
    });
    const subscriptionId = addOnSubscriptionIds.get(subscriptionAddOnId);
    if (!subscriptionId) {
      throw new Error('Reload the commercial record before changing this add-on.');
    }
    const subscription = await getSubscription(subscriptionId);
    const addOn = subscription.add_ons.find((item) => item.id === subscriptionAddOnId);
    if (!addOn) throw new Error('Subscription add-on was not found after the operation.');
    return mapAddOn(addOn);
  },

  async updateProductConfiguration() {
    throw new Error('Product configuration is not managed by the current Core commercial API.');
  },
};

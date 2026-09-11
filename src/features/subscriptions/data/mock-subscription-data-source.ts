import { resolveCommercialCatalogDataSource } from '../../commercial-catalog/data/resolve-commercial-catalog-data-source';
import type { BillingCycle } from '../../commercial-catalog/types/commercial-catalog';
import type { SubscriptionDataSource } from './subscription-data-source';
import type {
  ProductConfiguration,
  Subscription,
  SubscriptionAddOn,
  SubscriptionAddOnStatus,
  SubscriptionTerm,
} from '../types/subscription';

const PRODUCTS = [
  {
    clientId: 'client-nova',
    clientProductId: 'client-product-nova-pos',
    productId: 'product-pos',
    productName: 'Digvation POS',
    productCode: 'POS',
  },
];

const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'subscription-nova-pos',
    clientProductId: 'client-product-nova-pos',
    status: 'ACTIVE',
    autoRenew: false,
    renewalNoticeDays: 30,
    gracePeriodDays: 7,
    contractReference: 'NOVA-POS-2026',
    createdAt: '2026-06-12T04:30:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

const TERMS: SubscriptionTerm[] = [
  {
    id: 'term-nova-pos-2025',
    subscriptionId: 'subscription-nova-pos',
    startsAt: '2025-09-01T00:00:00.000Z',
    endsAt: '2026-09-01T00:00:00.000Z',
    billingCycle: 'ANNUAL',
    listAmountMinor: 220000000,
    agreedAmountMinor: 220000000,
    adjustmentType: 'NONE',
    currency: 'IDR',
    createdAt: '2025-09-01T00:00:00.000Z',
  },
  {
    id: 'term-nova-pos-2026',
    subscriptionId: 'subscription-nova-pos',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2027-09-01T00:00:00.000Z',
    billingCycle: 'ANNUAL',
    listAmountMinor: 240000000,
    agreedAmountMinor: 240000000,
    adjustmentType: 'NONE',
    currency: 'IDR',
    renewedFromTermId: 'term-nova-pos-2025',
    paymentTermsDays: 30,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

const ADD_ONS: SubscriptionAddOn[] = [];

const CONFIGURATIONS: ProductConfiguration[] = [
  {
    id: 'configuration-nova-pos-users',
    clientProductId: 'client-product-nova-pos',
    key: 'max_users',
    label: 'Maximum users',
    valueType: 'INTEGER',
    value: 12,
    unit: 'users',
  },
  {
    id: 'configuration-nova-pos-registers',
    clientProductId: 'client-product-nova-pos',
    key: 'max_registers',
    label: 'Maximum registers',
    valueType: 'INTEGER',
    value: 3,
    unit: 'registers',
  },
];

const ADD_ON_TRANSITIONS: Record<
  SubscriptionAddOnStatus,
  SubscriptionAddOnStatus[]
> = {
  ACTIVE: ['SUSPENDED', 'EXPIRED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
};

const MONTHS_PER_CYCLE: Partial<Record<BillingCycle, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

function copy<T>(value: T): T {
  return structuredClone(value);
}

function latestTerm(terms: SubscriptionTerm[]) {
  return [...terms].sort((left, right) =>
    right.startsAt.localeCompare(left.startsAt),
  )[0];
}

function effectiveTerm(terms: SubscriptionTerm[]) {
  const now = Date.now();
  return [...terms]
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
    .find((term) => {
      const startsAt = new Date(term.startsAt).getTime();
      const endsAt = term.endsAt ? new Date(term.endsAt).getTime() : undefined;
      return startsAt <= now && (endsAt === undefined || now < endsAt);
    });
}

function addMonthsClamped(anchor: Date, months: number) {
  const first = new Date(
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
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return first;
}

function prorate(
  term: SubscriptionTerm,
  effectiveFrom: Date,
  amountMinor: number,
) {
  const monthsPerCycle = MONTHS_PER_CYCLE[term.billingCycle];
  if (!monthsPerCycle) {
    throw new Error('Custom billing cycles do not support automatic proration.');
  }
  const anchor = new Date(term.startsAt);
  const end = term.endsAt ? new Date(term.endsAt) : undefined;
  if (
    Number.isNaN(effectiveFrom.getTime()) ||
    effectiveFrom < anchor ||
    (end && effectiveFrom >= end)
  ) {
    throw new Error('Add-on effective date must fall inside the current term.');
  }

  const monthsSinceAnchor =
    (effectiveFrom.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (effectiveFrom.getUTCMonth() - anchor.getUTCMonth());
  let periodIndex = Math.max(0, Math.floor(monthsSinceAnchor / monthsPerCycle));
  let periodStart = addMonthsClamped(anchor, periodIndex * monthsPerCycle);
  if (periodStart > effectiveFrom) {
    periodIndex = Math.max(0, periodIndex - 1);
    periodStart = addMonthsClamped(anchor, periodIndex * monthsPerCycle);
  }
  let periodEnd = addMonthsClamped(anchor, (periodIndex + 1) * monthsPerCycle);
  if (end && periodEnd > end) periodEnd = end;
  while (periodEnd <= effectiveFrom) {
    periodIndex += 1;
    periodStart = periodEnd;
    periodEnd = addMonthsClamped(anchor, (periodIndex + 1) * monthsPerCycle);
    if (end && periodEnd > end) periodEnd = end;
  }

  const totalMs = periodEnd.getTime() - periodStart.getTime();
  const remainingMs = periodEnd.getTime() - effectiveFrom.getTime();
  return Math.round((amountMinor * remainingMs) / totalMs);
}

function validateAdjustment(input: {
  listAmountMinor: number;
  agreedAmountMinor: number;
  adjustmentType: SubscriptionTerm['adjustmentType'];
  adjustmentReason?: string;
}) {
  if (
    !Number.isSafeInteger(input.agreedAmountMinor) ||
    input.agreedAmountMinor < 0
  ) {
    throw new Error('Agreed price must be a non-negative minor-unit amount.');
  }
  if (
    input.adjustmentType === 'NONE' &&
    input.agreedAmountMinor !== input.listAmountMinor
  ) {
    throw new Error(
      'Choose an adjustment type when agreed price differs from list price.',
    );
  }
  if (input.adjustmentType !== 'NONE' && !input.adjustmentReason?.trim()) {
    throw new Error('Adjustment reason is required for adjusted pricing.');
  }
  if (
    input.adjustmentType === 'COMPLIMENTARY' &&
    input.agreedAmountMinor !== 0
  ) {
    throw new Error('Complimentary pricing must use an agreed price of zero.');
  }
}

export function createMockSubscriptionDataSource(): SubscriptionDataSource {
  const products = copy(PRODUCTS);
  const subscriptions = copy(SUBSCRIPTIONS);
  const terms = copy(TERMS);
  const addOns = copy(ADD_ONS);
  const configurations = copy(CONFIGURATIONS);
  const commercialCatalog = resolveCommercialCatalogDataSource();

  return {
    async getClientCommercialSummary(clientId) {
      return products
        .filter((product) => product.clientId === clientId)
        .map((product) => {
          const subscription = subscriptions.find(
            (item) => item.clientProductId === product.clientProductId,
          );
          const subscriptionTerms = subscription
            ? terms.filter((term) => term.subscriptionId === subscription.id)
            : [];
          return {
            ...product,
            subscription: subscription ? copy(subscription) : undefined,
            currentTerm: effectiveTerm(subscriptionTerms),
            latestTerm: latestTerm(subscriptionTerms),
            terms: copy(subscriptionTerms),
            addOns: subscription
              ? copy(
                  addOns.filter(
                    (item) => item.subscriptionId === subscription.id,
                  ),
                )
              : [],
            configurations: copy(
              configurations.filter(
                (item) => item.clientProductId === product.clientProductId,
              ),
            ),
          };
        });
    },

    async createInitialSubscription(input) {
      if (
        subscriptions.some(
          (subscription) =>
            subscription.clientProductId === input.clientProductId,
        )
      ) {
        throw new Error(
          'A subscription is already configured for this client product.',
        );
      }
      if (!input.startsAt || (input.endsAt && input.endsAt <= input.startsAt)) {
        throw new Error('A subscription term must end after it starts.');
      }
      const catalogPrices = await commercialCatalog.getProductPrices(
        input.productId,
      );
      const catalogPrice = catalogPrices.find(
        (price) =>
          price.billingCycle === input.billingCycle &&
          price.currency === input.currency.toUpperCase(),
      );
      if (!catalogPrice) {
        throw new Error(
          'A Product list price is required for this billing cycle and currency.',
        );
      }
      const agreedAmountMinor =
        input.agreedAmountMinor ?? catalogPrice.amountMinor;
      validateAdjustment({
        listAmountMinor: catalogPrice.amountMinor,
        agreedAmountMinor,
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason,
      });

      const timestamp = new Date().toISOString();
      const subscription: Subscription = {
        id: `subscription-${input.clientProductId}`,
        clientProductId: input.clientProductId,
        status: 'ACTIVE',
        autoRenew: input.autoRenew,
        renewalNoticeDays: input.renewalNoticeDays,
        gracePeriodDays: input.gracePeriodDays,
        contractReference: input.contractReference?.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      subscriptions.push(subscription);
      if (
        !products.some(
          (product) => product.clientProductId === input.clientProductId,
        )
      ) {
        products.push({
          clientId: input.clientId,
          clientProductId: input.clientProductId,
          productId: input.productId,
          productName: input.productName,
          productCode: input.productCode,
        });
      }
      terms.push({
        id: `term-${subscription.id}-initial`,
        subscriptionId: subscription.id,
        startsAt: new Date(input.startsAt).toISOString(),
        endsAt: input.endsAt
          ? new Date(input.endsAt).toISOString()
          : undefined,
        billingCycle: input.billingCycle,
        listAmountMinor: catalogPrice.amountMinor,
        agreedAmountMinor,
        currency: input.currency.toUpperCase(),
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason?.trim() || undefined,
        paymentTermsDays: input.paymentTermsDays,
        createdAt: timestamp,
      });
      return copy(subscription);
    },

    async addRenewalTerm(subscriptionId, input) {
      const subscription = subscriptions.find(
        (item) => item.id === subscriptionId,
      );
      if (!subscription) throw new Error('Subscription was not found.');
      if (
        subscription.status === 'EXPIRED' ||
        subscription.status === 'CANCELLED'
      ) {
        throw new Error('Cancelled or expired subscriptions cannot be renewed.');
      }

      const product = products.find(
        (item) => item.clientProductId === subscription.clientProductId,
      );
      if (!product) throw new Error('Client Product was not found.');
      const previous = latestTerm(
        terms.filter((term) => term.subscriptionId === subscriptionId),
      );
      if (!previous?.endsAt) {
        throw new Error('Close the current open-ended term before renewal.');
      }
      if (!input.startsAt || (input.endsAt && input.endsAt <= input.startsAt)) {
        throw new Error('A subscription term must end after it starts.');
      }

      const startsAt = new Date(input.startsAt);
      const previousEndsAt = new Date(previous.endsAt);
      if (
        Number.isNaN(startsAt.getTime()) ||
        startsAt.getTime() < previousEndsAt.getTime()
      ) {
        throw new Error('A renewal term cannot overlap the previous term.');
      }

      const currency = input.currency.toUpperCase();
      const liveAddOns = addOns.filter(
        (addOn) =>
          addOn.subscriptionId === subscriptionId &&
          (addOn.status === 'ACTIVE' || addOn.status === 'SUSPENDED'),
      );
      if (liveAddOns.length) {
        if (startsAt.getTime() !== previousEndsAt.getTime()) {
          throw new Error(
            'Renewal term must be contiguous while live add-ons are co-termed.',
          );
        }
        if (
          liveAddOns.some(
            (addOn) =>
              !addOn.effectiveUntil ||
              new Date(addOn.effectiveUntil).getTime() !==
                previousEndsAt.getTime(),
          )
        ) {
          throw new Error(
            'Live add-ons must end with the current term before renewal.',
          );
        }
        if (
          liveAddOns.some(
            (addOn) =>
              addOn.billingCycle !== input.billingCycle ||
              addOn.currency !== currency,
          )
        ) {
          throw new Error(
            'Close live add-ons before changing renewal billing cycle or currency.',
          );
        }
      }

      const catalogPrices = await commercialCatalog.getProductPrices(
        product.productId,
      );
      const catalogPrice = catalogPrices.find(
        (price) =>
          price.billingCycle === input.billingCycle &&
          price.currency === currency,
      );
      if (!catalogPrice) {
        throw new Error('A current Product list price is required for renewal.');
      }
      const agreedAmountMinor =
        input.agreedAmountMinor ?? catalogPrice.amountMinor;
      validateAdjustment({
        listAmountMinor: catalogPrice.amountMinor,
        agreedAmountMinor,
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason,
      });
      const term: SubscriptionTerm = {
        id: `term-${subscriptionId}-${Date.now()}`,
        subscriptionId,
        startsAt: startsAt.toISOString(),
        endsAt: input.endsAt
          ? new Date(input.endsAt).toISOString()
          : undefined,
        billingCycle: input.billingCycle,
        listAmountMinor: catalogPrice.amountMinor,
        agreedAmountMinor,
        currency,
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason?.trim() || undefined,
        renewedFromTermId: previous.id,
        paymentTermsDays: input.paymentTermsDays,
        createdAt: new Date().toISOString(),
      };
      terms.push(term);
      for (const addOn of liveAddOns) {
        addOn.effectiveUntil = term.endsAt;
        addOn.updatedAt = new Date().toISOString();
      }
      return copy(term);
    },

    async addSubscriptionAddOn(input) {
      const subscription = subscriptions.find(
        (item) => item.id === input.subscriptionId,
      );
      if (!subscription) throw new Error('Subscription was not found.');
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        throw new Error(
          'Subscription must be active or trial before adding an add-on.',
        );
      }
      if (
        addOns.some(
          (item) =>
            item.subscriptionId === input.subscriptionId &&
            item.addOnOfferingId === input.addOnOfferingId &&
            (item.status === 'ACTIVE' || item.status === 'SUSPENDED'),
        )
      ) {
        throw new Error('This add-on is already active or suspended.');
      }
      const product = products.find(
        (item) => item.clientProductId === subscription.clientProductId,
      );
      if (!product) throw new Error('Client Product was not found.');
      const offering = await commercialCatalog.getAddOn(
        input.addOnOfferingId,
      );
      if (!offering || offering.status !== 'ACTIVE') {
        throw new Error('Add-on offering must be active.');
      }
      if (offering.productId !== product.productId) {
        throw new Error('Add-on offering belongs to a different Product.');
      }
      const effectiveFrom = new Date(input.effectiveFrom);
      const subscriptionTerms = terms
        .filter((term) => term.subscriptionId === input.subscriptionId)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
      const term = [...subscriptionTerms].reverse().find(
        (candidate) =>
          new Date(candidate.startsAt) <= effectiveFrom &&
          (!candidate.endsAt || effectiveFrom < new Date(candidate.endsAt)),
      );
      if (!term) {
        throw new Error(
          'Add-on effective date must fall inside a subscription term.',
        );
      }
      const price = offering.prices.find(
        (candidate) =>
          candidate.billingCycle === term.billingCycle &&
          candidate.currency === term.currency,
      );
      if (!price) {
        throw new Error(
          'Add-on list price is required for the current billing cycle and currency.',
        );
      }
      const agreedAmountMinor = input.agreedAmountMinor ?? price.amountMinor;
      validateAdjustment({
        listAmountMinor: price.amountMinor,
        agreedAmountMinor,
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason,
      });
      const timestamp = new Date().toISOString();
      const item: SubscriptionAddOn = {
        id: `subscription-add-on-${input.subscriptionId}-${input.addOnOfferingId}-${Date.now()}`,
        subscriptionId: input.subscriptionId,
        addOnOfferingId: input.addOnOfferingId,
        addOnCode: offering.code,
        addOnName: offering.name,
        status: 'ACTIVE',
        effectiveFrom: effectiveFrom.toISOString(),
        effectiveUntil: term.endsAt,
        billingCycle: term.billingCycle,
        currency: term.currency,
        listAmountMinor: price.amountMinor,
        agreedAmountMinor,
        initialProratedAmountMinor: prorate(
          term,
          effectiveFrom,
          agreedAmountMinor,
        ),
        adjustmentType: input.adjustmentType,
        adjustmentReason: input.adjustmentReason?.trim() || undefined,
        prorationPolicy: 'CO_TERM_PRORATED',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      addOns.push(item);
      return copy(item);
    },

    async transitionSubscriptionAddOn(
      subscriptionAddOnId,
      targetStatus,
      reason,
    ) {
      const item = addOns.find(
        (candidate) => candidate.id === subscriptionAddOnId,
      );
      if (!item) throw new Error('Subscription add-on was not found.');
      if (!reason.trim()) throw new Error('A lifecycle reason is required.');
      if (!ADD_ON_TRANSITIONS[item.status].includes(targetStatus)) {
        throw new Error(`Cannot transition ${item.status} to ${targetStatus}.`);
      }

      if (targetStatus === 'ACTIVE') {
        const subscription = subscriptions.find(
          (candidate) => candidate.id === item.subscriptionId,
        );
        if (
          !subscription ||
          (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL')
        ) {
          throw new Error(
            'Parent subscription must be trial or active before reactivating the add-on.',
          );
        }
        const offering = await commercialCatalog.getAddOn(
          item.addOnOfferingId,
        );
        if (!offering || offering.status !== 'ACTIVE') {
          throw new Error(
            'Add-on offering must be active before reactivating the client add-on.',
          );
        }
        if (
          item.effectiveUntil &&
          new Date(item.effectiveUntil).getTime() <= Date.now()
        ) {
          throw new Error('Expired add-on period cannot be reactivated.');
        }
      }

      item.status = targetStatus;
      item.updatedAt = new Date().toISOString();
      return copy(item);
    },

    async updateProductConfiguration(clientProductId, next) {
      const retained = configurations.filter(
        (item) => item.clientProductId !== clientProductId,
      );
      configurations.splice(
        0,
        configurations.length,
        ...retained,
        ...copy(next),
      );
      return copy(
        configurations.filter(
          (item) => item.clientProductId === clientProductId,
        ),
      );
    },
  };
}

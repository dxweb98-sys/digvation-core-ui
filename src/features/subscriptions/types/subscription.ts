import type {
  BillingCycle,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';

export type SubscriptionStatus =
  | 'PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type SubscriptionAddOnStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ProrationPolicy = 'CO_TERM_PRORATED';
export type ProductConfigurationValueType = 'INTEGER' | 'BOOLEAN' | 'STRING';

export interface Subscription {
  id: string;
  clientProductId: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  renewalNoticeDays: number;
  gracePeriodDays?: number;
  contractReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionTerm {
  id: string;
  subscriptionId: string;
  startsAt: string;
  endsAt?: string;
  billingCycle: BillingCycle;
  listAmountMinor: number;
  agreedAmountMinor: number;
  currency: string;
  adjustmentType: CommercialAdjustmentType;
  adjustmentReason?: string;
  renewedFromTermId?: string;
  paymentTermsDays?: number;
  createdAt: string;
}

export interface SubscriptionAddOn {
  id: string;
  subscriptionId: string;
  addOnOfferingId: string;
  addOnCode: string;
  addOnName: string;
  status: SubscriptionAddOnStatus;
  effectiveFrom: string;
  effectiveUntil?: string;
  billingCycle: BillingCycle;
  currency: string;
  listAmountMinor: number;
  agreedAmountMinor: number;
  initialProratedAmountMinor: number;
  adjustmentType: CommercialAdjustmentType;
  adjustmentReason?: string;
  prorationPolicy: ProrationPolicy;
  createdAt: string;
  updatedAt: string;
}

export interface ProductConfiguration {
  id: string;
  clientProductId: string;
  key: string;
  label: string;
  valueType: ProductConfigurationValueType;
  value: string | number | boolean;
  unit?: string;
}

export interface ClientProductCommercialSummary {
  clientProductId: string;
  productId: string;
  productName: string;
  productCode: string;
  subscription?: Subscription;
  currentTerm?: SubscriptionTerm;
  terms: SubscriptionTerm[];
  addOns: SubscriptionAddOn[];
  configurations: ProductConfiguration[];
}

export interface CommercialTermInput {
  startsAt: string;
  endsAt?: string;
  billingCycle: BillingCycle;
  agreedAmountMinor?: number;
  currency: string;
  adjustmentType: CommercialAdjustmentType;
  adjustmentReason?: string;
  paymentTermsDays?: number;
}

export interface RenewalTermInput extends CommercialTermInput {}

export interface InitialSubscriptionInput extends CommercialTermInput {
  clientProductId: string;
  clientId: string;
  productId: string;
  productName: string;
  productCode: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  gracePeriodDays?: number;
  contractReference?: string;
}

export interface AddSubscriptionAddOnInput {
  subscriptionId: string;
  addOnOfferingId: string;
  effectiveFrom: string;
  agreedAmountMinor?: number;
  adjustmentType: CommercialAdjustmentType;
  adjustmentReason?: string;
}

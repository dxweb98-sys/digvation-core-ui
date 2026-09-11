export type BillingCycle =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'ANNUAL'
  | 'CUSTOM';

export type CommercialAdjustmentType =
  | 'NONE'
  | 'PROMOTIONAL'
  | 'NEGOTIATED'
  | 'GRANDFATHERED'
  | 'COMPLIMENTARY';

export type AddOnOfferingStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface CatalogPrice {
  id: string;
  billingCycle: BillingCycle;
  currency: string;
  amountMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddOnGrantFeature {
  productFeatureId: string;
  code: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
}

export interface AddOnGrantCapability {
  capabilityId: string;
  code: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
}

export interface AddOnOffering {
  id: string;
  productId: string;
  code: string;
  name: string;
  description?: string;
  status: AddOnOfferingStatus;
  statusChangedAt: string;
  prices: CatalogPrice[];
  featureGrants: AddOnGrantFeature[];
  capabilityGrants: AddOnGrantCapability[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCatalogPriceInput {
  billingCycle: BillingCycle;
  currency: string;
  amountMinor: number;
}

export interface AddOnOfferingInput {
  productId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateAddOnOfferingInput {
  addOnOfferingId: string;
  name: string;
  description?: string;
}

export interface ReplaceAddOnOfferingGrantsInput {
  addOnOfferingId: string;
  featureIds: string[];
  capabilityIds: string[];
}

export interface AddOnOfferingTransitionInput {
  addOnOfferingId: string;
  targetStatus: AddOnOfferingStatus;
  reason: string;
}

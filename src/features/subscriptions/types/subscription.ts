export type SubscriptionStatus = 'PENDING' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'CUSTOM';
export type ProductConfigurationValueType = 'INTEGER' | 'BOOLEAN' | 'STRING';
export interface Subscription { id: string; clientProductId: string; status: SubscriptionStatus; autoRenew: boolean; renewalNoticeDays: number; gracePeriodDays?: number; contractReference?: string; createdAt: string; updatedAt: string; }
export interface SubscriptionTerm { id: string; subscriptionId: string; startsAt: string; endsAt?: string; billingCycle: BillingCycle; amountMinor: number; currency: string; renewedFromTermId?: string; paymentTermsDays?: number; createdAt: string; }
export interface ProductConfiguration { id: string; clientProductId: string; key: string; label: string; valueType: ProductConfigurationValueType; value: string | number | boolean; unit?: string; }
export interface ClientProductCommercialSummary { clientProductId: string; productName: string; productCode: string; subscription?: Subscription; currentTerm?: SubscriptionTerm; terms: SubscriptionTerm[]; configurations: ProductConfiguration[]; }
export interface RenewalTermInput { startsAt: string; endsAt?: string; billingCycle: BillingCycle; amountMinor: number; currency: string; paymentTermsDays?: number; }

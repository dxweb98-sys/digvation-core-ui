import type {
  AddSubscriptionAddOnInput,
  ClientProductCommercialSummary,
  InitialSubscriptionInput,
  ProductConfiguration,
  RenewalTermInput,
  Subscription,
  SubscriptionAddOn,
  SubscriptionAddOnStatus,
  SubscriptionTerm,
} from '../types/subscription';

export interface SubscriptionDataSource {
  getClientCommercialSummary(clientId: string): Promise<ClientProductCommercialSummary[]>;
  createInitialSubscription(input: InitialSubscriptionInput): Promise<Subscription>;
  addRenewalTerm(
    subscriptionId: string,
    input: RenewalTermInput,
  ): Promise<SubscriptionTerm>;
  addSubscriptionAddOn(input: AddSubscriptionAddOnInput): Promise<SubscriptionAddOn>;
  transitionSubscriptionAddOn(
    subscriptionAddOnId: string,
    targetStatus: SubscriptionAddOnStatus,
    reason: string,
  ): Promise<SubscriptionAddOn>;
  updateProductConfiguration(
    clientProductId: string,
    configurations: ProductConfiguration[],
  ): Promise<ProductConfiguration[]>;
}

import type {
  AssignClientProductInput,
  AssignableProduct,
  ClientProduct,
  ClientProductStatusTransitionInput,
  ClientProductSummary,
  ProductClientSummary,
  ReplaceClientProductFeaturesInput,
} from '../types/client-product';

export interface ClientProductDataSource {
  getClientProducts(clientId: string): Promise<ClientProductSummary[]>;
  getProductClients(productId: string): Promise<ProductClientSummary[]>;
  getAssignableProducts(clientId: string): Promise<AssignableProduct[]>;
  getClientProductFeatureIds(clientProductId: string): Promise<string[]>;
  assignProduct(input: AssignClientProductInput): Promise<ClientProduct>;
  replaceClientProductFeatures(input: ReplaceClientProductFeaturesInput): Promise<void>;
  transitionClientProductStatus(input: ClientProductStatusTransitionInput): Promise<ClientProduct>;
}

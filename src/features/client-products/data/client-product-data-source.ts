import type {
  AssignClientProductInput,
  AssignableProduct,
  ClientProduct,
  ClientProductStatusTransitionInput,
  ClientProductSummary,
  ProductClientSummary,
} from '../types/client-product';

export interface ClientProductDataSource {
  getClientProducts(clientId: string): Promise<ClientProductSummary[]>;
  getProductClients(productId: string): Promise<ProductClientSummary[]>;
  getAssignableProducts(clientId: string): Promise<AssignableProduct[]>;
  assignProduct(input: AssignClientProductInput): Promise<ClientProduct>;
  transitionClientProductStatus(input: ClientProductStatusTransitionInput): Promise<ClientProduct>;
}

import type {
  Capability,
  CreateProductInput,
  ProductDetail,
  ProductListQuery,
  ProductListResult,
  ProductStatusTransitionInput,
  ReplaceProductCapabilitiesInput,
  UpdateProductInput,
} from '../types/product';

export interface ProductDataSource {
  getProducts(query: ProductListQuery): Promise<ProductListResult>;
  getProductDetail(productId: string): Promise<ProductDetail | null>;
  getCapabilities(): Promise<Capability[]>;
  createProduct(input: CreateProductInput): Promise<ProductDetail>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductDetail>;
  transitionProductStatus(input: ProductStatusTransitionInput): Promise<ProductDetail>;
  replaceProductCapabilities(input: ReplaceProductCapabilitiesInput): Promise<void>;
}

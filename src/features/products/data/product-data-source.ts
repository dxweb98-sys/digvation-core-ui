import type {
  CreateProductFeatureInput,
  CreateProductInput,
  ProductDetail,
  ProductFeatureStatusTransitionInput,
  ProductListQuery,
  ProductListResult,
  ProductStatusTransitionInput,
  ReplaceProductCapabilitiesInput,
  UpdateProductFeatureInput,
  UpdateProductInput,
} from '../types/product';

export interface ProductDataSource {
  getProducts(query: ProductListQuery): Promise<ProductListResult>;
  getProductDetail(productId: string): Promise<ProductDetail | null>;
  createProduct(input: CreateProductInput): Promise<ProductDetail>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductDetail>;
  transitionProductStatus(input: ProductStatusTransitionInput): Promise<ProductDetail>;
  createProductFeature(input: CreateProductFeatureInput): Promise<void>;
  updateProductFeature(input: UpdateProductFeatureInput): Promise<void>;
  transitionProductFeatureStatus(input: ProductFeatureStatusTransitionInput): Promise<void>;
  replaceProductCapabilities(input: ReplaceProductCapabilitiesInput): Promise<void>;
}

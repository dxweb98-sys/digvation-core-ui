import type {
  CreateProductFeatureInput,
  CreateProductInput,
  ProductDetail,
  ProductFeatureStatusTransitionInput,
  ProductListQuery,
  ProductListResult,
  ProductMappingVocabulary,
  ProductStatusTransitionInput,
  ReplaceProductCapabilitiesInput,
  UpdateProductFeatureInput,
  UpdateProductInput,
  UpdateProductMappingInput,
} from '../types/product';

export interface ProductDataSource {
  getProducts(query: ProductListQuery): Promise<ProductListResult>;
  getProductDetail(productId: string): Promise<ProductDetail | null>;
  createProduct(input: CreateProductInput): Promise<ProductDetail>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductDetail>;
  getMappingVocabulary(): Promise<ProductMappingVocabulary>;
  /** Null when the change was saved but could not be read back. */
  updateProductMapping(productId: string, input: UpdateProductMappingInput): Promise<ProductDetail | null>;
  /** Null when the change was saved but could not be read back. */
  transitionProductStatus(input: ProductStatusTransitionInput): Promise<ProductDetail | null>;
  createProductFeature(input: CreateProductFeatureInput): Promise<void>;
  updateProductFeature(input: UpdateProductFeatureInput): Promise<void>;
  transitionProductFeatureStatus(input: ProductFeatureStatusTransitionInput): Promise<void>;
  replaceProductCapabilities(input: ReplaceProductCapabilitiesInput): Promise<void>;
}

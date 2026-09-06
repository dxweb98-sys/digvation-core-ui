import type {
  CreateProductInput,
  ProductDetail,
  ProductListQuery,
  ProductListResult,
  ProductStatusTransitionInput,
  UpdateProductInput,
} from '../types/product';

export interface ProductDataSource {
  getProducts(query: ProductListQuery): Promise<ProductListResult>;
  getProductDetail(productId: string): Promise<ProductDetail | null>;
  createProduct(input: CreateProductInput): Promise<ProductDetail>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductDetail>;
  transitionProductStatus(input: ProductStatusTransitionInput): Promise<ProductDetail>;
}

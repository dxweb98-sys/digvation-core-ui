import { describe, expect, it } from 'vitest';
import { createMockProductDataSource } from './mock-product-data-source';

describe('mock product data source', () => {
  it('filters products through the query boundary', async () => {
    const dataSource = createMockProductDataSource();
    const result = await dataSource.getProducts({ search: 'workshop', status: 'DRAFT', page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.products[0]).toMatchObject({ code: 'DIGVATION-WORKSHOP', status: 'DRAFT' });
  });

  it('normalizes a new product code and starts the product in draft', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.createProduct({ code: ' customer portal ', name: 'Customer Portal', description: '' });

    expect(detail.product).toMatchObject({ code: 'CUSTOMER-PORTAL', name: 'Customer Portal', status: 'DRAFT' });
  });

  it('keeps product code immutable when information is updated', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.updateProduct('product-pos', { name: 'Digvation POS Suite', description: 'Updated description.' });

    expect(detail.product.code).toBe('DIGVATION-POS');
    expect(detail.product.name).toBe('Digvation POS Suite');
  });

  it('enforces valid lifecycle transitions with a reason', async () => {
    const dataSource = createMockProductDataSource();

    await expect(dataSource.transitionProductStatus({ productId: 'product-pos', targetStatus: 'RETIRED', reason: '' })).rejects.toThrow('reason is required');
    await expect(dataSource.transitionProductStatus({ productId: 'product-pos', targetStatus: 'DRAFT', reason: 'Incorrect transition.' })).rejects.toThrow('Cannot transition ACTIVE to DRAFT');

    const detail = await dataSource.transitionProductStatus({ productId: 'product-pos', targetStatus: 'RETIRED', reason: 'Product consolidation.' });
    expect(detail.product.status).toBe('RETIRED');
  });

  it('allows a draft product to transition directly to retired', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.transitionProductStatus({ productId: 'product-workshop', targetStatus: 'RETIRED', reason: 'Scope was deferred.' });

    expect(detail.product.status).toBe('RETIRED');
  });
});

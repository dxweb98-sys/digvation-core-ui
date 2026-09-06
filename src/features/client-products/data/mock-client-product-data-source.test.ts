import { describe, expect, it } from 'vitest';
import { createMockClientProductDataSource } from './mock-client-product-data-source';

describe('mock client product data source', () => {
  it('returns resolved relationship summaries for the client and product views', async () => {
    const dataSource = createMockClientProductDataSource();

    await expect(dataSource.getClientProducts('client-nova')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ productName: 'Digvation POS', status: 'ACTIVE' })]),
    );
    await expect(dataSource.getProductClients('product-company-site')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ clientDisplayName: 'Poseidon Filter', status: 'ACTIVE' })]),
    );
  });

  it('assigns only unassigned products and begins provisioning', async () => {
    const dataSource = createMockClientProductDataSource();
    const assignableProducts = await dataSource.getAssignableProducts('client-poseidon');
    expect(assignableProducts.map((product) => product.id)).toContain('product-pos');
    expect(assignableProducts.map((product) => product.id)).not.toContain('product-company-site');

    const clientProduct = await dataSource.assignProduct({ clientId: 'client-poseidon', productId: 'product-pos' });
    expect(clientProduct.status).toBe('PROVISIONING');
    await expect(dataSource.assignProduct({ clientId: 'client-poseidon', productId: 'product-pos' })).rejects.toThrow('already assigned');
  });

  it('enforces lifecycle reasons and valid transitions', async () => {
    const dataSource = createMockClientProductDataSource();

    await expect(dataSource.transitionClientProductStatus({ clientProductId: 'client-product-nova-pos', targetStatus: 'SUSPENDED', reason: '' })).rejects.toThrow('reason is required');
    await expect(dataSource.transitionClientProductStatus({ clientProductId: 'client-product-nova-pos', targetStatus: 'TRIAL', reason: 'Invalid transition.' })).rejects.toThrow('Cannot transition ACTIVE to TRIAL');

    const clientProduct = await dataSource.transitionClientProductStatus({ clientProductId: 'client-product-nova-pos', targetStatus: 'SUSPENDED', reason: 'Scheduled account review.' });
    expect(clientProduct.status).toBe('SUSPENDED');
  });
});

import { describe, expect, it } from 'vitest';
import { createMockClientProductDataSource } from './mock-client-product-data-source';

describe('mock client product data source', () => {
  it('returns resolved relationship summaries for the active product assignment', async () => {
    const dataSource = createMockClientProductDataSource();

    await expect(dataSource.getClientProducts('client-nova')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productName: 'Digvation POS',
          productCode: 'POS',
          status: 'ACTIVE',
        }),
      ]),
    );
    await expect(dataSource.getProductClients('product-pos')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientDisplayName: 'Nova Salon',
          status: 'ACTIVE',
        }),
      ]),
    );
  });

  it('offers only active, unassigned products for client composition', async () => {
    const dataSource = createMockClientProductDataSource();

    await expect(dataSource.getAssignableProducts('client-nova')).resolves.toEqual([]);
    await expect(dataSource.getAssignableProducts('client-poseidon')).resolves.toEqual([
      expect.objectContaining({ id: 'product-pos', code: 'POS' }),
    ]);

    await expect(
      dataSource.assignProduct({
        clientId: 'client-poseidon',
        productId: 'product-workshop',
      }),
    ).rejects.toThrow('not active');

    const clientProduct = await dataSource.assignProduct({
      clientId: 'client-poseidon',
      productId: 'product-pos',
    });
    expect(clientProduct.status).toBe('PROVISIONING');
    await expect(
      dataSource.assignProduct({
        clientId: 'client-poseidon',
        productId: 'product-pos',
      }),
    ).rejects.toThrow('already assigned');
  });

  it('enforces lifecycle reasons and valid transitions', async () => {
    const dataSource = createMockClientProductDataSource();

    await expect(
      dataSource.transitionClientProductStatus({
        clientProductId: 'client-product-nova-pos',
        targetStatus: 'SUSPENDED',
        reason: '',
      }),
    ).rejects.toThrow('reason is required');
    await expect(
      dataSource.transitionClientProductStatus({
        clientProductId: 'client-product-nova-pos',
        targetStatus: 'TRIAL',
        reason: 'Invalid transition.',
      }),
    ).rejects.toThrow('Cannot transition ACTIVE to TRIAL');

    const clientProduct = await dataSource.transitionClientProductStatus({
      clientProductId: 'client-product-nova-pos',
      targetStatus: 'SUSPENDED',
      reason: 'Scheduled account review.',
    });
    expect(clientProduct.status).toBe('SUSPENDED');
  });
});

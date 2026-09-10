import { describe, expect, it } from 'vitest';
import { createMockProductDataSource } from './mock-product-data-source';

describe('mock product data source', () => {
  it('filters products through the query boundary', async () => {
    const dataSource = createMockProductDataSource();
    const result = await dataSource.getProducts({
      search: 'workshop',
      status: 'DRAFT',
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.products[0]).toMatchObject({
      code: 'WORKSHOP',
      status: 'DRAFT',
    });
  });

  it('exposes only the locked POS feature catalog while Workshop and Inventory remain unscoped', async () => {
    const dataSource = createMockProductDataSource();

    const pos = await dataSource.getProductDetail('product-pos');
    expect(pos?.features.map((feature) => feature.code)).toEqual([
      'pos.sales',
      'pos.checkout',
      'pos.payments',
      'pos.receipts',
      'pos.refunds-voids',
      'pos.cashier-sessions',
    ]);

    await expect(dataSource.getProductDetail('product-workshop')).resolves.toMatchObject({
      features: [],
    });
    await expect(dataSource.getProductDetail('product-inventory')).resolves.toMatchObject({
      features: [],
      capabilities: [],
    });
  });

  it('keeps ProductCapability as compatibility catalog rather than client entitlement', async () => {
    const dataSource = createMockProductDataSource();
    const workshop = await dataSource.getProductDetail('product-workshop');

    expect(workshop?.capabilities.map((capability) => capability.code)).toEqual(
      expect.arrayContaining([
        'CUSTOMER_MANAGEMENT',
        'MEMBERSHIP',
        'PROMOTIONS',
        'TAX_FISCAL',
        'LOYALTY_POINTS',
      ]),
    );
  });

  it('replaces product capability compatibility without mutating the capability catalog', async () => {
    const dataSource = createMockProductDataSource();
    const catalog = await dataSource.getCapabilities();
    const membership = catalog.find((capability) => capability.code === 'MEMBERSHIP');
    const promotions = catalog.find((capability) => capability.code === 'PROMOTIONS');

    expect(membership).toBeDefined();
    expect(promotions).toBeDefined();

    await dataSource.replaceProductCapabilities({
      productId: 'product-workshop',
      capabilityIds: [membership!.id, promotions!.id],
    });

    const workshop = await dataSource.getProductDetail('product-workshop');
    expect(workshop?.capabilities.map((capability) => capability.code)).toEqual([
      'MEMBERSHIP',
      'PROMOTIONS',
    ]);
    expect(await dataSource.getCapabilities()).toHaveLength(catalog.length);
  });

  it('normalizes a new product code and starts the product in draft', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.createProduct({
      code: ' customer portal ',
      name: 'Customer Portal',
      description: '',
    });

    expect(detail.product).toMatchObject({
      code: 'CUSTOMER-PORTAL',
      name: 'Customer Portal',
      status: 'DRAFT',
    });
    expect(detail.capabilities).toEqual([]);
  });

  it('keeps product code immutable when information is updated', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.updateProduct('product-pos', {
      name: 'Digvation POS Suite',
      description: 'Updated description.',
    });

    expect(detail.product.code).toBe('POS');
    expect(detail.product.name).toBe('Digvation POS Suite');
  });

  it('enforces valid lifecycle transitions with a reason', async () => {
    const dataSource = createMockProductDataSource();

    await expect(
      dataSource.transitionProductStatus({
        productId: 'product-pos',
        targetStatus: 'RETIRED',
        reason: '',
      }),
    ).rejects.toThrow('reason is required');
    await expect(
      dataSource.transitionProductStatus({
        productId: 'product-pos',
        targetStatus: 'DRAFT',
        reason: 'Incorrect transition.',
      }),
    ).rejects.toThrow('Cannot transition ACTIVE to DRAFT');

    const detail = await dataSource.transitionProductStatus({
      productId: 'product-pos',
      targetStatus: 'RETIRED',
      reason: 'Product consolidation.',
    });
    expect(detail.product.status).toBe('RETIRED');
  });

  it('allows a draft product to transition directly to retired and freezes compatibility changes', async () => {
    const dataSource = createMockProductDataSource();
    const detail = await dataSource.transitionProductStatus({
      productId: 'product-workshop',
      targetStatus: 'RETIRED',
      reason: 'Scope was deferred.',
    });

    expect(detail.product.status).toBe('RETIRED');
    await expect(
      dataSource.replaceProductCapabilities({
        productId: 'product-workshop',
        capabilityIds: [],
      }),
    ).rejects.toThrow('retired product');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coreProductDataSource } from './core-product-data-source';
import { createMockProductDataSource } from './mock-product-data-source';

vi.mock('../../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

const fetchMock = vi.fn<typeof fetch>();

function answer(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const CORE_DETAIL = {
  id: 'offering',
  code: 'POS_SALON',
  name: 'POS Salon',
  description: null,
  status: 'DRAFT',
  status_changed_at: '2026-01-01T00:00:00Z',
  feature_count: 0,
  client_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  features: [],
  capabilities: [
    { capability_id: 'tax', code: 'TAX_FISCAL', name: 'Tax', description: null, status: 'ACTIVE', inclusion: 'INCLUDED' },
    { capability_id: 'old', code: 'OLD', name: 'Old', description: null, status: 'ACTIVE' },
  ],
  domain_codes: ['POS'],
  application_codes: ['POS_SALON_APP'],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('core product mapping', () => {
  it('maps domains, applications and per-capability inclusion', async () => {
    fetchMock.mockResolvedValue(answer(CORE_DETAIL));

    const detail = await coreProductDataSource.getProductDetail('offering');

    expect(detail?.domainCodes).toEqual(['POS']);
    expect(detail?.applicationCodes).toEqual(['POS_SALON_APP']);
    expect(detail?.capabilities.map(({ inclusion }) => inclusion)).toEqual(['INCLUDED', 'COMPATIBLE']);
  });

  it('treats absent mapping fields as empty', async () => {
    fetchMock.mockResolvedValue(
      answer({ ...CORE_DETAIL, domain_codes: undefined, application_codes: undefined }),
    );

    const detail = await coreProductDataSource.getProductDetail('offering');

    expect(detail?.domainCodes).toEqual([]);
    expect(detail?.applicationCodes).toEqual([]);
  });

  it('reads the vocabulary from its endpoint', async () => {
    const vocabulary = { domains: [{ code: 'POS', served: true }], applications: [] };
    fetchMock.mockResolvedValue(answer(vocabulary));

    await expect(coreProductDataSource.getMappingVocabulary()).resolves.toEqual(vocabulary);
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/products/mapping-vocabulary');
  });

  it('sends the mapping through PATCH with only the mapping fields', async () => {
    fetchMock.mockImplementation(async (_input, init) =>
      answer(init?.method === 'PATCH' ? { product_id: 'offering' } : CORE_DETAIL),
    );

    await coreProductDataSource.updateProductMapping('offering', {
      domainCodes: ['POS'],
      applicationCodes: ['OPERATIONAL_APP'],
    });

    const [input, init] = fetchMock.mock.calls[0];
    expect(new URL(String(input)).pathname).toBe('/products/offering');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({
      domain_codes: ['POS'],
      application_codes: ['OPERATIONAL_APP'],
    });
  });

  it.each([
    ['mapping', () => coreProductDataSource.updateProductMapping('offering', { domainCodes: ['POS'], applicationCodes: [] })],
    ['status', () => coreProductDataSource.transitionProductStatus({ productId: 'offering', targetStatus: 'ACTIVE', reason: 'Ready' })],
  ])('resolves a saved %s change when the read-back fails', async (_name, write) => {
    fetchMock.mockImplementation(async (_input, init) =>
      (init?.method ?? 'GET') === 'GET'
        ? new Response(JSON.stringify({ success: false, error: { message: 'Down' } }), { status: 500 })
        : answer({ product_id: 'offering' }),
    );

    await expect(write()).resolves.toBeNull();
  });

  it('still rejects when the write itself fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'Product POS_SALON needs a domain grant before it can be activated' } }), { status: 409 }),
    );

    await expect(
      coreProductDataSource.transitionProductStatus({ productId: 'offering', targetStatus: 'ACTIVE', reason: 'Ready' }),
    ).rejects.toThrow('needs a domain grant');
  });

  it('sends included_capability_ids through PUT, including an empty set', async () => {
    fetchMock.mockImplementation(async () => answer({}));

    await coreProductDataSource.replaceProductCapabilities({
      productId: 'offering',
      capabilityIds: ['tax'],
      includedCapabilityIds: [],
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      capability_ids: ['tax'],
      included_capability_ids: [],
    });
  });
});

describe('mock product mapping behaves like CORE', () => {
  const draft = async () => {
    const source = createMockProductDataSource();
    const { product } = await source.createProduct({ code: 'SALON', name: 'Salon' });
    return { source, id: product.id };
  };

  it('offers the same vocabulary, with Backoffice implicit', async () => {
    const vocabulary = await createMockProductDataSource().getMappingVocabulary();

    expect(vocabulary.domains).toEqual([
      { code: 'POS', served: true },
      { code: 'WORKSHOP', served: false },
      { code: 'INVENTORY', served: false },
    ]);
    expect(vocabulary.applications.find(({ implicit }) => implicit)?.code).toBe('BACKOFFICE');
  });

  it('runs create, map, include, activate', async () => {
    const { source, id } = await draft();
    const activate = () =>
      source.transitionProductStatus({ productId: id, targetStatus: 'ACTIVE', reason: 'Ready' });

    await expect(activate()).rejects.toThrow('needs a domain grant');
    await source.updateProductMapping(id, {
      domainCodes: ['pos'],
      applicationCodes: ['POS_SALON_APP'],
    });
    await source.replaceProductCapabilities({
      productId: id,
      capabilityIds: ['capability-tax-fiscal'],
      includedCapabilityIds: ['capability-tax-fiscal'],
    });
    const detail = await activate();

    expect(detail?.product.status).toBe('ACTIVE');
    expect(detail?.domainCodes).toEqual(['POS']);
    expect(detail?.applicationCodes).toEqual(['POS_SALON_APP']);
    expect(detail?.capabilities[0]?.inclusion).toBe('INCLUDED');
    await expect(
      source.updateProductMapping(id, { domainCodes: [], applicationCodes: [] }),
    ).rejects.toThrow('must keep at least one domain grant');
  });

  it('rejects Backoffice and unknown codes', async () => {
    const { source, id } = await draft();

    await expect(
      source.updateProductMapping(id, { domainCodes: [], applicationCodes: ['BACKOFFICE'] }),
    ).rejects.toThrow('granted implicitly');
    await expect(
      source.updateProductMapping(id, { domainCodes: ['NOPE'], applicationCodes: [] }),
    ).rejects.toThrow('Unknown domain code(s): NOPE');
    await expect(
      source.updateProductMapping(id, { domainCodes: [], applicationCodes: ['NOPE'] }),
    ).rejects.toThrow('Unknown application code(s): NOPE');
  });

  it('blocks changes while a client holds the active product, and allows no-ops', async () => {
    const source = createMockProductDataSource();

    await expect(
      source.updateProductMapping('product-pos', {
        domainCodes: ['POS', 'WORKSHOP'],
        applicationCodes: ['OPERATIONAL_APP'],
      }),
    ).rejects.toThrow('would alter 1 client product(s)');
    await expect(
      source.replaceProductCapabilities({
        productId: 'product-pos',
        capabilityIds: ['capability-tax-fiscal'],
        includedCapabilityIds: [],
      }),
    ).rejects.toThrow('would alter 1 client product(s)');
    await expect(
      source.updateProductMapping('product-pos', {
        domainCodes: ['POS'],
        applicationCodes: ['OPERATIONAL_APP'],
      }),
    ).resolves.toMatchObject({ domainCodes: ['POS'] });
  });

  it('rejects mapping a retired product and included outside the compatible set', async () => {
    const { source, id } = await draft();

    await expect(
      source.replaceProductCapabilities({
        productId: id,
        capabilityIds: [],
        includedCapabilityIds: ['capability-tax-fiscal'],
      }),
    ).rejects.toThrow('part of the compatibility set');
    await source.transitionProductStatus({ productId: id, targetStatus: 'RETIRED', reason: 'Dropped' });
    await expect(
      source.updateProductMapping(id, { domainCodes: ['POS'], applicationCodes: [] }),
    ).rejects.toThrow('retired product');
  });
});

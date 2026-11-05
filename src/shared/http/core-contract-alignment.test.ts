import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coreCommercialCatalogDataSource } from '../../features/commercial-catalog/data/core-commercial-catalog-data-source';
import { coreProductDataSource } from '../../features/products/data/core-product-data-source';
import { coreSubscriptionDataSource } from '../../features/subscriptions/data/core-subscription-data-source';
import { coreApiRequest, CoreApiError, loginCoreApiSession } from './core-api-client';
import {
  clearCoreSessionTokens,
  getCoreAccessToken,
  getCoreCsrfToken,
} from './core-api-session';

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// The envelope CORE's global exception filter sends.
const coreError = (code: string, message: string) => ({ success: false, error: { code, message } });

const addOn = (overrides: Record<string, unknown> = {}) => ({
  id: 'offering',
  product_id: 'product',
  code: 'ADDON',
  name: 'Add-on',
  description: null,
  status: 'ACTIVE',
  status_changed_at: '2026-11-01T00:00:00.000Z',
  prices: [],
  feature_grants: [],
  capability_grants: [],
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const subscription = (overrides: Record<string, unknown> = {}) => ({
  id: 'subscription',
  client_product_id: 'client-product',
  client_add_on_id: null,
  status: 'ACTIVE',
  auto_renew: false,
  renewal_notice_days: 30,
  grace_period_days: null,
  contract_reference: null,
  terms: [],
  current_term: null,
  latest_term: null,
  add_ons: [],
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('commercial catalog contract', () => {
  it('reads a nullable product_id and the new scope', async () => {
    respond(200, addOn({ product_id: null, scope: 'CLIENT' }));

    const offering = await coreCommercialCatalogDataSource.getAddOn('offering');

    expect(offering?.id).toBe('offering');
    expect(offering?.productId).toBeUndefined();
  });

  it('keeps the product of a product-scope offering', async () => {
    respond(200, addOn({ scope: 'PRODUCT' }));

    const offering = await coreCommercialCatalogDataSource.getAddOn('offering');

    expect(offering?.productId).toBe('product');
  });

  it.each([404, 409])('treats a %s on /add-ons/:id as not in this catalog', async (status) => {
    respond(status, coreError('CONFLICT', 'Not managed by this catalog'));

    await expect(coreCommercialCatalogDataSource.getAddOn('offering')).resolves.toBeNull();
  });

  it('still rejects other /add-ons/:id failures', async () => {
    respond(500, coreError('INTERNAL_ERROR', 'Server error'));

    await expect(coreCommercialCatalogDataSource.getAddOn('offering')).rejects.toMatchObject({
      status: 500,
    });
  });
});

describe('subscription contract', () => {
  it('reads a subscription owned by a client add-on', async () => {
    respond(201, { subscription_id: 'subscription' });
    respond(200, subscription({ client_product_id: null, client_add_on_id: 'client-add-on' }));

    const created = await coreSubscriptionDataSource.createInitialSubscription({
      clientProductId: 'client-product',
      startsAt: '2026-11-01',
      billingCycle: 'MONTHLY',
      currency: 'IDR',
      agreedAmountMinor: 1000,
      adjustmentType: 'NONE',
      autoRenew: false,
      renewalNoticeDays: 30,
    } as never);

    expect(created.id).toBe('subscription');
    expect(created.clientProductId).toBeUndefined();
  });

  it('keeps reading products when the summary also has client_add_ons', async () => {
    respond(200, {
      items: [
        {
          client_product_id: 'client-product',
          product_id: 'product',
          product_code: 'POS',
          product_name: 'POS',
          subscription: subscription(),
        },
      ],
      client_add_ons: [
        {
          client_add_on_id: 'client-add-on',
          add_on_offering_id: 'offering',
          add_on_code: 'ATTENDANCE',
          add_on_name: 'Attendance',
          status: 'ACTIVE',
          subscription: subscription({ client_product_id: null }),
        },
      ],
    });

    const summary = await coreSubscriptionDataSource.getClientCommercialSummary('client');

    expect(summary).toHaveLength(1);
    expect(summary[0].clientProductId).toBe('client-product');
    expect(summary[0].subscription?.clientProductId).toBe('client-product');
  });

  it('rejects POST /subscriptions/:id/add-ons with the CORE 409 message', async () => {
    const message = 'Client-scope shared add-ons are not managed by the product add-on catalog';
    respond(409, coreError('CONFLICT', message));

    const result = coreSubscriptionDataSource.addSubscriptionAddOn({
      subscriptionId: 'subscription',
      addOnOfferingId: 'offering',
      effectiveFrom: '2026-11-01',
      adjustmentType: 'NONE',
    } as never);

    await expect(result).rejects.toBeInstanceOf(CoreApiError);
    await expect(result).rejects.toMatchObject({ status: 409, message });
  });
});

describe('product contract', () => {
  it('reads a product detail with the offering mapping fields', async () => {
    respond(200, {
      id: 'product',
      code: 'POS_SALON',
      name: 'POS Salon',
      description: null,
      status: 'DRAFT',
      status_changed_at: '2026-11-01T00:00:00.000Z',
      feature_count: 0,
      client_count: 0,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
      features: [],
      capabilities: [
        {
          capability_id: 'capability',
          code: 'TAX_FISCAL',
          name: 'Tax',
          description: null,
          status: 'ACTIVE',
          inclusion: 'INCLUDED',
        },
      ],
      domain_codes: ['POS'],
      application_codes: ['POS_SALON_APP'],
    });

    const detail = await coreProductDataSource.getProductDetail('product');

    expect(detail?.capabilities.map((capability) => capability.code)).toEqual(['TAX_FISCAL']);
    expect(detail?.capabilities[0]?.inclusion).toBe('INCLUDED');
    expect(detail?.domainCodes).toEqual(['POS']);
    expect(detail?.applicationCodes).toEqual(['POS_SALON_APP']);
  });

  it('keeps sending only capability_ids so CORE preserves existing inclusions', async () => {
    respond(200, { included_capability_ids: ['capability'] });

    await coreProductDataSource.replaceProductCapabilities({
      productId: 'product',
      capabilityIds: ['capability'],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ capability_ids: ['capability'] });
  });
});

describe('CORE response envelope', () => {
  it('returns the data of a wrapped response', async () => {
    respond(200, {
      success: true,
      data: { id: 'client-1' },
      request_id: 'r',
      timestamp: 't',
    });

    await expect(coreApiRequest('/clients/client-1')).resolves.toEqual({ id: 'client-1' });
  });

  it('keeps an unwrapped response as it is', async () => {
    respond(200, { status: 'ok' });

    await expect(coreApiRequest('/health')).resolves.toEqual({ status: 'ok' });
  });

  it('stores the tokens from a wrapped login, so later requests are authorized', async () => {
    respond(200, {
      success: true,
      data: { access_token: 'token-1', csrf_token: 'csrf-1', remember_me: false },
    });
    await loginCoreApiSession({ identifier: 'a', password: 'b' });
    expect(getCoreAccessToken()).toBe('token-1');
    expect(getCoreCsrfToken()).toBe('csrf-1');

    respond(200, { success: true, data: { id: 'me' } });
    await coreApiRequest('/users/me');

    const [, init] = fetchMock.mock.calls[1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-1');
    clearCoreSessionTokens();
  });

  it('carries validation details from an error envelope', async () => {
    respond(400, {
      success: false,
      error: {
        code: 'VALIDATION',
        message: 'Request validation failed',
        details: ['display_name must be shorter than 150 characters'],
      },
    });

    await expect(coreApiRequest('/clients')).rejects.toMatchObject({
      status: 400,
      details: ['display_name must be shorter than 150 characters'],
    });
  });
});

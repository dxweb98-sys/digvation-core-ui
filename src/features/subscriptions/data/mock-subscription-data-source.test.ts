import { describe, expect, it } from 'vitest';
import { createMockSubscriptionDataSource } from './mock-subscription-data-source';

describe('mock subscription data source', () => {
  it('selects the latest term while preserving renewal history', async () => {
    const dataSource = createMockSubscriptionDataSource();
    const before = await dataSource.getClientCommercialSummary('client-nova');
    const pos = before.find((summary) => summary.productCode === 'DIGVATION-POS')!;
    expect(pos.currentTerm?.id).toBe('term-nova-pos-2026');
    await dataSource.addRenewalTerm(pos.subscription!.id, { startsAt: '2027-09-01', endsAt: '2028-08-31', billingCycle: 'ANNUAL', amountMinor: 260000000, currency: 'IDR' });
    const after = (await dataSource.getClientCommercialSummary('client-nova')).find((summary) => summary.productCode === 'DIGVATION-POS')!;
    expect(after.terms).toHaveLength(3);
    expect(after.currentTerm?.renewedFromTermId).toBe('term-nova-pos-2026');
  });

  it('rejects nonsensical renewal periods', async () => {
    const dataSource = createMockSubscriptionDataSource();
    await expect(dataSource.addRenewalTerm('subscription-nova-pos', { startsAt: '2026-08-31', endsAt: '2027-08-30', billingCycle: 'ANNUAL', amountMinor: 1, currency: 'IDR' })).rejects.toThrow('start after the previous term');
    await expect(dataSource.addRenewalTerm('subscription-nova-pos', { startsAt: '2027-09-01', endsAt: '2027-09-01', billingCycle: 'ANNUAL', amountMinor: 1, currency: 'IDR' })).rejects.toThrow('end after it starts');
  });
});

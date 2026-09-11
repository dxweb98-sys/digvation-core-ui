import { describe, expect, it } from 'vitest';

import { createMockClientCapabilityDataSource } from './mock-client-capability-data-source';

describe('mock client capability data source', () => {
  it('returns existing client capability assignments', async () => {
    const dataSource = createMockClientCapabilityDataSource();

    await expect(
      dataSource.getClientCapabilities('client-nova'),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilityId: 'capability-membership',
          status: 'ACTIVE',
          capability: expect.objectContaining({ code: 'MEMBERSHIP' }),
        }),
      ]),
    );
  });

  it('creates new assignments in provisioning state and rejects inactive capabilities', async () => {
    const dataSource = createMockClientCapabilityDataSource();

    const assignment = await dataSource.assignClientCapability({
      clientId: 'client-poseidon',
      capabilityId: 'capability-promotions',
    });
    expect(assignment.status).toBe('PROVISIONING');

    await expect(
      dataSource.assignClientCapability({
        clientId: 'client-poseidon',
        capabilityId: 'capability-loyalty-points',
      }),
    ).rejects.toThrow('not active');

    await expect(
      dataSource.assignClientCapability({
        clientId: 'client-poseidon',
        capabilityId: 'capability-promotions',
      }),
    ).rejects.toThrow('already assigned');
  });

  it('enforces lifecycle reasons and transition rules', async () => {
    const dataSource = createMockClientCapabilityDataSource();

    await expect(
      dataSource.transitionClientCapabilityStatus({
        clientId: 'client-nova',
        clientCapabilityId: 'client-capability-nova-membership',
        targetStatus: 'SUSPENDED',
        reason: '',
      }),
    ).rejects.toThrow('reason is required');

    await expect(
      dataSource.transitionClientCapabilityStatus({
        clientId: 'client-nova',
        clientCapabilityId: 'client-capability-nova-membership',
        targetStatus: 'TRIAL',
        reason: 'Invalid lifecycle change.',
      }),
    ).rejects.toThrow('Cannot transition ACTIVE to TRIAL');

    const updated = await dataSource.transitionClientCapabilityStatus({
      clientId: 'client-nova',
      clientCapabilityId: 'client-capability-nova-membership',
      targetStatus: 'SUSPENDED',
      reason: 'Temporarily suspend the add-on.',
    });
    expect(updated.status).toBe('SUSPENDED');
  });
});

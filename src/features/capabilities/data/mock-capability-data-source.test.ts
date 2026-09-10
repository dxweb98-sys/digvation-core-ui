import { describe, expect, it } from 'vitest';
import { createMockCapabilityDataSource } from './mock-capability-data-source';

describe('mock capability data source', () => {
  it('lists the accepted reusable capability catalog', async () => {
    const dataSource = createMockCapabilityDataSource();
    const result = await dataSource.getCapabilities({
      search: '',
      status: 'ALL',
      page: 1,
      limit: 100,
    });

    expect(result.capabilities.map((capability) => capability.code)).toEqual(
      expect.arrayContaining([
        'CUSTOMER_MANAGEMENT',
        'MEMBERSHIP',
        'PROMOTIONS',
        'TAX_FISCAL',
        'LOYALTY_POINTS',
      ]),
    );
    expect(result.capabilities.some((capability) => capability.code === 'CATALOG')).toBe(false);
    expect(result.capabilities.some((capability) => capability.code === 'FINANCE_OPERATIONS')).toBe(false);
  });

  it('creates a reusable capability as draft and keeps its code immutable on update', async () => {
    const dataSource = createMockCapabilityDataSource();
    const created = await dataSource.createCapability({
      code: 'appointment reminders',
      name: 'Appointment Reminders',
      description: 'Reusable appointment reminder behavior.',
    });

    expect(created).toMatchObject({
      code: 'APPOINTMENT_REMINDERS',
      status: 'DRAFT',
    });

    const updated = await dataSource.updateCapability(created.id, {
      name: 'Appointment Notifications',
      description: 'Reusable appointment notification behavior.',
    });

    expect(updated.code).toBe('APPOINTMENT_REMINDERS');
    expect(updated.name).toBe('Appointment Notifications');
  });

  it('enforces the capability lifecycle transition graph and reason requirement', async () => {
    const dataSource = createMockCapabilityDataSource();
    const created = await dataSource.createCapability({
      code: 'TEST_LIFECYCLE_CAPABILITY',
      name: 'Lifecycle Test Capability',
    });

    await expect(
      dataSource.transitionCapabilityStatus({
        capabilityId: created.id,
        targetStatus: 'ACTIVE',
        reason: '',
      }),
    ).rejects.toThrow('reason is required');

    const active = await dataSource.transitionCapabilityStatus({
      capabilityId: created.id,
      targetStatus: 'ACTIVE',
      reason: 'Capability scope approved.',
    });
    expect(active.status).toBe('ACTIVE');

    await expect(
      dataSource.transitionCapabilityStatus({
        capabilityId: created.id,
        targetStatus: 'DRAFT',
        reason: 'Invalid rollback.',
      }),
    ).rejects.toThrow('Cannot transition ACTIVE to DRAFT');
  });
});

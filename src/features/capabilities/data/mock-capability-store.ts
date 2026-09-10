import type { Capability } from '../types/capability';

const CAPABILITIES: Capability[] = [
  {
    id: 'capability-customer-management',
    code: 'CUSTOMER_MANAGEMENT',
    name: 'Customer Management',
    description: 'Reusable customer-management capability built on shared customer identity.',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'capability-membership',
    code: 'MEMBERSHIP',
    name: 'Membership',
    description: 'Reusable membership capability for enrollment, status, tier, benefits, and eligibility when enabled.',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'capability-promotions',
    code: 'PROMOTIONS',
    name: 'Promotions',
    description: 'Reusable customer-facing promotion, offer, discount, and commercial-rule capability.',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'capability-tax-fiscal',
    code: 'TAX_FISCAL',
    name: 'Tax / Fiscal',
    description: 'Reusable tax and fiscal-rule capability for compatible business products.',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'capability-loyalty-points',
    code: 'LOYALTY_POINTS',
    name: 'Loyalty Points',
    description: 'Optional loyalty-points capability kept separate from Membership.',
    status: 'DRAFT',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
];

export function getMockCapabilityStore() {
  return CAPABILITIES;
}

export function getMockCapabilitiesSnapshot() {
  return CAPABILITIES.map((capability) => ({ ...capability }));
}

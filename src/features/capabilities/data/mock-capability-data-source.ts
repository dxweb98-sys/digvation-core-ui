import type { CapabilityDataSource } from './capability-data-source';
import { getMockCapabilityStore } from './mock-capability-store';
import type { Capability, CapabilityStatus } from '../types/capability';

const VALID_TRANSITIONS: Record<CapabilityStatus, CapabilityStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function now() {
  return new Date().toISOString();
}

function copy(capability: Capability): Capability {
  return { ...capability };
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

export function createMockCapabilityDataSource(): CapabilityDataSource {
  const capabilities = getMockCapabilityStore();

  return {
    async getCapabilities(query) {
      const term = query.search.trim().toLowerCase();
      const matches = capabilities.filter((capability) => {
        const hasStatus = query.status === 'ALL' || capability.status === query.status;
        const searchable = [capability.code, capability.name, capability.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hasStatus && searchable.includes(term);
      });
      const totalPages = Math.max(1, Math.ceil(matches.length / query.limit));
      const page = Math.min(Math.max(query.page, 1), totalPages);
      const start = (page - 1) * query.limit;
      return {
        capabilities: matches.slice(start, start + query.limit).map(copy),
        total: matches.length,
        totalPages,
      };
    },

    async getCapability(capabilityId) {
      const capability = capabilities.find((candidate) => candidate.id === capabilityId);
      return capability ? copy(capability) : null;
    },

    async createCapability(input) {
      const code = normalizeCode(input.code);
      if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
        throw new Error('Capability code must use uppercase letters, numbers, underscores, or hyphens.');
      }
      if (capabilities.some((capability) => capability.code === code)) {
        throw new Error('Capability code is already in use.');
      }
      const timestamp = now();
      const capability: Capability = {
        id: `capability-${code.toLowerCase().replace(/_/g, '-')}-${capabilities.length + 1}`,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        status: 'DRAFT',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      capabilities.unshift(capability);
      return copy(capability);
    },

    async updateCapability(capabilityId, input) {
      const capability = capabilities.find((candidate) => candidate.id === capabilityId);
      if (!capability) throw new Error('Capability was not found.');
      capability.name = input.name.trim();
      capability.description = input.description?.trim() || undefined;
      capability.updatedAt = now();
      return copy(capability);
    },

    async transitionCapabilityStatus(input) {
      const capability = capabilities.find((candidate) => candidate.id === input.capabilityId);
      if (!capability) throw new Error('Capability was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[capability.status].includes(input.targetStatus)) {
        throw new Error(`Cannot transition ${capability.status} to ${input.targetStatus}.`);
      }
      capability.status = input.targetStatus;
      capability.updatedAt = now();
      return copy(capability);
    },
  };
}

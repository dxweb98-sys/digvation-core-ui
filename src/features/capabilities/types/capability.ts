export type CapabilityStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface Capability {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: CapabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityListQuery {
  search: string;
  status: CapabilityStatus | 'ALL';
  page: number;
  limit: number;
}

export interface CapabilityListResult {
  capabilities: Capability[];
  total: number;
  totalPages: number;
}

export interface CreateCapabilityInput {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCapabilityInput {
  name: string;
  description?: string;
}

export interface CapabilityStatusTransitionInput {
  capabilityId: string;
  targetStatus: CapabilityStatus;
  reason: string;
}

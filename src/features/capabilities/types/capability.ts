export type CapabilityStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface CapabilitySummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: CapabilityStatus;
}

export interface Capability extends CapabilitySummary {
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

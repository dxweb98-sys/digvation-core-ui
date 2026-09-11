import type { CapabilitySummary } from '../../capabilities/types/capability';
import type { ClientProductSummary } from '../../client-products/types/client-product';

export type ClientCapabilityStatus =
  | 'PROVISIONING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'DECOMMISSIONED';

export interface ClientCapability {
  id: string;
  clientId: string;
  capabilityId: string;
  status: ClientCapabilityStatus;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientCapabilitySummary extends ClientCapability {
  capability: CapabilitySummary;
}

export interface AssignClientCapabilityInput {
  clientId: string;
  capabilityId: string;
}

export interface ClientCapabilityStatusTransitionInput {
  clientId: string;
  clientCapabilityId: string;
  targetStatus: ClientCapabilityStatus;
  reason: string;
}

export interface CompatibleClientCapability {
  capability: CapabilitySummary;
  productCodes: string[];
}

export interface CompatibleClientCapabilityInput {
  clientProducts: ClientProductSummary[];
}

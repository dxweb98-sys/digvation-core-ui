import type {
  Capability,
  CapabilityListQuery,
  CapabilityListResult,
  CapabilityStatusTransitionInput,
  CreateCapabilityInput,
  UpdateCapabilityInput,
} from '../types/capability';

export interface CapabilityDataSource {
  getCapabilities(query: CapabilityListQuery): Promise<CapabilityListResult>;
  getCapability(capabilityId: string): Promise<Capability | null>;
  createCapability(input: CreateCapabilityInput): Promise<Capability>;
  updateCapability(capabilityId: string, input: UpdateCapabilityInput): Promise<Capability>;
  transitionCapabilityStatus(input: CapabilityStatusTransitionInput): Promise<Capability>;
}

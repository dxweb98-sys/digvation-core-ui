import type {
  AssignClientCapabilityInput,
  ClientCapability,
  ClientCapabilityStatusTransitionInput,
  ClientCapabilitySummary,
} from '../types/client-capability';

export interface ClientCapabilityDataSource {
  getClientCapabilities(clientId: string): Promise<ClientCapabilitySummary[]>;
  assignClientCapability(input: AssignClientCapabilityInput): Promise<ClientCapability>;
  transitionClientCapabilityStatus(
    input: ClientCapabilityStatusTransitionInput,
  ): Promise<ClientCapability>;
}

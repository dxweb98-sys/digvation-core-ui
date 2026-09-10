import {
  DButton,
  DCard,
  DCardContent,
  DEmptyState,
  DLoadingIndicator,
  useToast,
} from '@digvation/ui';

import { CapabilityStatusBadge } from '../../capabilities/components/capability-status-badge';
import type { ClientProductSummary } from '../../client-products/types/client-product';
import {
  useAssignClientCapability,
  useClientCapabilityStatusTransition,
} from '../hooks/use-client-capability-mutations';
import { useClientCapabilities } from '../hooks/use-client-capabilities';
import { useCompatibleClientCapabilities } from '../hooks/use-compatible-client-capabilities';
import type {
  ClientCapabilityStatus,
  CompatibleClientCapability,
} from '../types/client-capability';
import { ClientCapabilityLifecycleAction } from './client-capability-lifecycle-action';
import { ClientCapabilityStatusBadge } from './client-capability-status-badge';
import '../client-capabilities.css';

export function ClientCapabilitiesSection({
  clientId,
  clientProducts,
  canAssignCapabilities,
}: {
  clientId: string;
  clientProducts: ClientProductSummary[];
  canAssignCapabilities: boolean;
}) {
  const assignmentsQuery = useClientCapabilities(clientId);
  const compatibility = useCompatibleClientCapabilities(clientProducts);
  const assignCapability = useAssignClientCapability();
  const transitionCapability = useClientCapabilityStatusTransition();
  const { showToast } = useToast();

  async function assign(capability: CompatibleClientCapability) {
    try {
      await assignCapability.mutateAsync({
        clientId,
        capabilityId: capability.capability.id,
      });
      showToast({
        title: 'Capability assigned',
        description: `${capability.capability.name} was added in provisioning state. Activate it when the entitlement is ready to become effective.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Capability assignment failed',
        description:
          error instanceof Error
            ? error.message
            : 'The capability could not be assigned to this client.',
        variant: 'danger',
      });
    }
  }

  async function transition(
    clientCapabilityId: string,
    targetStatus: ClientCapabilityStatus,
    reason: string,
  ) {
    await transitionCapability.mutateAsync({
      clientId,
      clientCapabilityId,
      targetStatus,
      reason,
    });
  }

  const assignments = assignmentsQuery.data ?? [];
  const compatible = compatibility.items;
  const compatibilityByCapabilityId = new Map(
    compatible.map((item) => [item.capability.id, item]),
  );
  const orphanAssignments = assignments.filter(
    (assignment) => !compatibilityByCapabilityId.has(assignment.capabilityId),
  );

  return (
    <DCard variant="outlined">
      <DCardContent>
        <div className="client-capability-section">
          <div className="client-composition-copy">
            <strong>Reusable capability entitlements</strong>
            <p>
              Capabilities are granted to the client, not to an individual
              client-product relationship. Only capabilities supported by at
              least one eligible assigned product can be added.
            </p>
          </div>

          {assignmentsQuery.isPending || compatibility.isPending ? (
            <div className="client-product-tab-state">
              <DLoadingIndicator label="Loading capability composition" />
            </div>
          ) : assignmentsQuery.isError || compatibility.isError ? (
            <DEmptyState
              title="Capability composition unavailable"
              description="Client capability assignments or product compatibility could not be loaded."
              action={
                <DButton
                  variant="outline"
                  onClick={() => {
                    void assignmentsQuery.refetch();
                    void compatibility.refetch();
                  }}
                >
                  Retry
                </DButton>
              }
            />
          ) : compatible.length === 0 && assignments.length === 0 ? (
            <DEmptyState
              title="No compatible capabilities"
              description="Assign an eligible product with capability compatibility before adding reusable capabilities to this client."
            />
          ) : (
            <div className="client-capability-list">
              {compatible.map((item) => {
                const assignment = assignments.find(
                  (candidate) =>
                    candidate.capabilityId === item.capability.id,
                );
                return (
                  <article
                    key={item.capability.id}
                    className="client-capability-row"
                  >
                    <div className="client-capability-copy">
                      <div className="client-capability-identity">
                        <strong>{item.capability.name}</strong>
                        <code>{item.capability.code}</code>
                      </div>
                      {item.capability.description ? (
                        <span>{item.capability.description}</span>
                      ) : null}
                      <small>
                        Available through {item.productCodes.join(', ')}
                      </small>
                    </div>
                    <div className="client-capability-state">
                      <CapabilityStatusBadge status={item.capability.status} />
                      {assignment ? (
                        <ClientCapabilityStatusBadge
                          status={assignment.status}
                        />
                      ) : null}
                    </div>
                    <div className="client-capability-actions">
                      {assignment ? (
                        <ClientCapabilityLifecycleAction
                          assignment={assignment}
                          isSubmitting={transitionCapability.isPending}
                          onTransition={(targetStatus, reason) =>
                            transition(assignment.id, targetStatus, reason)
                          }
                        />
                      ) : (
                        <DButton
                          size="sm"
                          variant="outline"
                          disabled={
                            !canAssignCapabilities ||
                            item.capability.status !== 'ACTIVE' ||
                            assignCapability.isPending
                          }
                          onClick={() => void assign(item)}
                        >
                          {!canAssignCapabilities
                            ? 'Client Not Active'
                            : item.capability.status === 'ACTIVE'
                              ? 'Assign'
                              : 'Not Active'}
                        </DButton>
                      )}
                    </div>
                  </article>
                );
              })}

              {orphanAssignments.map((assignment) => (
                <article
                  key={assignment.capabilityId}
                  className="client-capability-row is-unavailable"
                >
                  <div className="client-capability-copy">
                    <div className="client-capability-identity">
                      <strong>{assignment.capability.name}</strong>
                      <code>{assignment.capability.code}</code>
                    </div>
                    <span>
                      No currently eligible assigned product declares
                      compatibility with this capability.
                    </span>
                  </div>
                  <div className="client-capability-state">
                    <CapabilityStatusBadge
                      status={assignment.capability.status}
                    />
                    <ClientCapabilityStatusBadge status={assignment.status} />
                  </div>
                  <ClientCapabilityLifecycleAction
                    assignment={assignment}
                    isSubmitting={transitionCapability.isPending}
                    onTransition={(targetStatus, reason) =>
                      transition(assignment.id, targetStatus, reason)
                    }
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </DCardContent>
    </DCard>
  );
}

import {
  DButton,
  DDialog,
  DDropdown,
  DTextarea,
  useToast,
} from '@digvation/ui';
import { useState } from 'react';

import type {
  ClientCapabilityStatus,
  ClientCapabilitySummary,
} from '../types/client-capability';
import { ClientCapabilityStatusBadge } from './client-capability-status-badge';

const VALID_TRANSITIONS: Record<
  ClientCapabilityStatus,
  ClientCapabilityStatus[]
> = {
  PROVISIONING: ['TRIAL', 'ACTIVE', 'CANCELLED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['PROVISIONING', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONING'],
};

const PARENT_ACTIVE_REQUIRED = new Set<ClientCapabilityStatus>([
  'PROVISIONING',
  'TRIAL',
  'ACTIVE',
]);

const TRANSITION_LABELS: Record<ClientCapabilityStatus, string> = {
  PROVISIONING: 'Re-provision',
  TRIAL: 'Start Trial',
  ACTIVE: 'Activate',
  SUSPENDED: 'Suspend',
  CANCELLED: 'Cancel',
  DECOMMISSIONED: 'Decommission',
};

export function ClientCapabilityLifecycleAction({
  assignment,
  canBecomeEffective,
  isSubmitting,
  onTransition,
}: {
  assignment: ClientCapabilitySummary;
  canBecomeEffective: boolean;
  isSubmitting: boolean;
  onTransition: (
    targetStatus: ClientCapabilityStatus,
    reason: string,
  ) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] =
    useState<ClientCapabilityStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const { showToast } = useToast();
  const availableTransitions = VALID_TRANSITIONS[assignment.status].filter(
    (status) => canBecomeEffective || !PARENT_ACTIVE_REQUIRED.has(status),
  );

  function closeDialog() {
    if (isSubmitting) return;
    setTargetStatus(null);
    setReason('');
    setReasonError(null);
  }

  async function confirmTransition() {
    if (!targetStatus) return;
    if (!reason.trim()) {
      setReasonError('A reason is required for this lifecycle change.');
      return;
    }
    try {
      await onTransition(targetStatus, reason);
      showToast({
        title: 'Capability assignment updated',
        description: `${assignment.capability.name} is now ${targetStatus.toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Lifecycle update failed',
        description:
          error instanceof Error
            ? error.message
            : 'The capability assignment lifecycle state could not be changed.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown
        placement="bottom-end"
        closeOnItemClick
        contentRole="menu"
        contentClassName="client-capability-lifecycle-menu"
        trigger={() => (
          <DButton
            variant="outline"
            size="sm"
            aria-label={`Actions for ${assignment.capability.name}`}
            title={
              availableTransitions.length
                ? 'Actions'
                : 'No lifecycle actions available'
            }
            disabled={availableTransitions.length === 0}
          >
            •••
          </DButton>
        )}
      >
        {availableTransitions.map((status) => (
          <button
            className={
              status === 'CANCELLED' || status === 'DECOMMISSIONED'
                ? 'client-capability-lifecycle-menu-item is-danger'
                : 'client-capability-lifecycle-menu-item'
            }
            key={status}
            role="menuitem"
            type="button"
            onClick={() => setTargetStatus(status)}
          >
            {TRANSITION_LABELS[status]}
          </button>
        ))}
      </DDropdown>

      <DDialog
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Confirm capability change"
        description="Provide a reason before changing the client capability lifecycle state."
        footer={
          <div className="client-product-dialog-actions">
            <DButton
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Cancel
            </DButton>
            <DButton
              variant={
                targetStatus === 'CANCELLED' || targetStatus === 'DECOMMISSIONED'
                  ? 'danger'
                  : 'primary'
              }
              onClick={() => void confirmTransition()}
              loading={isSubmitting}
            >
              Confirm change
            </DButton>
          </div>
        }
      >
        {targetStatus ? (
          <div className="client-capability-transition-dialog">
            <p>
              <strong>{assignment.capability.name}</strong> will move from{' '}
              <ClientCapabilityStatusBadge status={assignment.status} /> to{' '}
              <ClientCapabilityStatusBadge status={targetStatus} />.
            </p>
            <DTextarea
              label="Reason *"
              placeholder="Explain why this capability state is changing."
              value={reason}
              error={reasonError}
              onChange={(value) => {
                setReason(value);
                if (reasonError) setReasonError(null);
              }}
            />
          </div>
        ) : null}
      </DDialog>
    </>
  );
}

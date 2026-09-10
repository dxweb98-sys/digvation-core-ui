import { DButton, DDialog, DDropdown, DTextarea, useToast } from '@digvation/ui';
import { useState } from 'react';
import type { Capability, CapabilityStatus } from '../types/capability';
import { CapabilityStatusBadge } from './capability-status-badge';

const VALID_TRANSITIONS: Record<CapabilityStatus, CapabilityStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function formatStatus(status: CapabilityStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function CapabilityLifecycleAction({
  capability,
  isSubmitting,
  onTransition,
}: {
  capability: Capability;
  isSubmitting: boolean;
  onTransition: (targetStatus: CapabilityStatus, reason: string) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<CapabilityStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const { showToast } = useToast();

  function closeDialog() {
    if (!isSubmitting) {
      setTargetStatus(null);
      setReason('');
      setReasonError(null);
    }
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
        title: 'Capability lifecycle updated',
        description: `${capability.name} is now ${formatStatus(targetStatus).toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Lifecycle update failed',
        description:
          error instanceof Error
            ? error.message
            : 'The capability lifecycle state could not be changed.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown
        placement="bottom-end"
        contentRole="menu"
        contentClassName="capability-lifecycle-menu"
        trigger={() => <DButton variant="outline">More Actions</DButton>}
      >
        {VALID_TRANSITIONS[capability.status].map((status) => (
          <button
            className={
              status === 'RETIRED'
                ? 'capability-lifecycle-menu-item is-danger'
                : 'capability-lifecycle-menu-item'
            }
            key={status}
            role="menuitem"
            type="button"
            onClick={() => setTargetStatus(status)}
          >
            Mark {formatStatus(status)}
          </button>
        ))}
      </DDropdown>
      <DDialog
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Confirm capability lifecycle change"
        description="Lifecycle changes can affect Product compatibility and Client entitlement. Provide a reason before continuing."
        footer={
          <div className="capability-dialog-actions">
            <DButton
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Cancel
            </DButton>
            <DButton
              variant={targetStatus === 'RETIRED' ? 'danger' : 'primary'}
              onClick={() => void confirmTransition()}
              loading={isSubmitting}
            >
              Confirm change
            </DButton>
          </div>
        }
      >
        {targetStatus ? (
          <div className="capability-transition-dialog">
            <p>
              <strong>{capability.name}</strong> will move from{' '}
              <CapabilityStatusBadge status={capability.status} /> to{' '}
              <CapabilityStatusBadge status={targetStatus} />.
            </p>
            <DTextarea
              label="Reason *"
              placeholder="Explain why this lifecycle state is changing."
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

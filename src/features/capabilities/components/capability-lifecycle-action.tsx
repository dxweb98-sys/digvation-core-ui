import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { transitionLabel } from '../../../shared/labels/labels';
import { labelFor } from '../../../shared/labels/labels';
import { ChevronDown } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type { Capability, CapabilityStatus } from '../types/capability';
import { CapabilityStatusBadge } from './capability-status-badge';

const VALID_TRANSITIONS: Record<CapabilityStatus, CapabilityStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function formatStatus(status: string) {
  return labelFor(status);
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
      setReasonError('Enter a reason.');
      focusFirstInvalid('lifecycle-reason');
      return;
    }
    try {
      await onTransition(targetStatus, reason);
      showToast({
        title: 'Capability status updated',
        description: `${capability.name} is now ${formatStatus(targetStatus).toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Status update failed',
        description:
          error instanceof Error
            ? error.message
            : 'The status could not be changed. Try again.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown closeOnItemClick
        placement="bottom-end"
        contentRole="menu"
        contentClassName="capability-lifecycle-menu"
        trigger={() => <AppAction tone="secondary" trailingIcon={ChevronDown}>More</AppAction>}
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
            {transitionLabel(status)}
          </button>
        ))}
      </DDropdown>
      <AppDialog kind="confirm"
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Change capability status"
        description="Add a reason to continue."
        footer={
          <div className="capability-dialog-actions">
            <AppAction
              tone="secondary"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Cancel
            </AppAction>
            <AppAction
              tone={targetStatus === 'RETIRED' ? 'danger' : 'primary'}
              onClick={() => void confirmTransition()}
              loading={isSubmitting}
            >
              Confirm
            </AppAction>
          </div>
        }
      >
        {targetStatus ? (
          <div className="capability-transition-dialog" id="lifecycle-reason">
            <p>
              <strong>{capability.name}</strong> will move from{' '}
              <CapabilityStatusBadge status={capability.status} /> to{' '}
              <CapabilityStatusBadge status={targetStatus} />
            </p>
            <AppTextarea
              label="Reason"
              placeholder="For example, contract ended on 30 June"
              value={reason}
              error={reasonError} onBlur={() => { if (!reason.trim()) setReasonError('Enter a reason.'); }}
              onChange={(value) => {
                setReason(value);
                if (reasonError) setReasonError(null);
              }}
            />
          </div>
        ) : null}
      </AppDialog>
    </>
  );
}

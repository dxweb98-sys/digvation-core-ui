import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { ChevronDown } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type { InstallationStatus, InstallationSummary } from '../types/installation';
import { InstallationStatusBadge } from './installation-status-badge';

const TRANSITIONS: Record<InstallationStatus, InstallationStatus[]> = {
  PROVISIONING: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
  ACTIVE: ['SUSPENDED', 'DECOMMISSIONED'],
  SUSPENDED: ['ACTIVE', 'DECOMMISSIONED'],
  DECOMMISSIONED: [],
};

export function InstallationLifecycleAction({
  installation,
  isSubmitting,
  onTransition,
}: {
  installation: InstallationSummary;
  isSubmitting: boolean;
  onTransition: (targetStatus: InstallationStatus, reason: string) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<InstallationStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const { showToast } = useToast();
  const transitions = TRANSITIONS[installation.status];

  if (transitions.length === 0) return null;

  function closeDialog() {
    if (!isSubmitting) {
      setTargetStatus(null);
      setReason('');
      setReasonError(null);
    }
  }

  async function confirm() {
    if (!targetStatus) return;
    if (!reason.trim()) {
      setReasonError('Enter a reason.');
      focusFirstInvalid('lifecycle-reason');
      return;
    }
    try {
      await onTransition(targetStatus, reason.trim());
      showToast({
        title: 'Installation status updated',
        description: `${installation.name} is now ${labelFor(targetStatus).toLowerCase()}.`,
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
        placement="top-end"
        contentRole="menu"
        contentClassName="installation-lifecycle-menu"
        trigger={() => <AppAction tone="secondary" trailingIcon={ChevronDown}>More</AppAction>}
      >
        {transitions.map((status) => (
          <button
            className={
              status === 'DECOMMISSIONED'
                ? 'installation-lifecycle-menu-item is-danger'
                : 'installation-lifecycle-menu-item'
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
        title="Change installation status"
        description="Add a reason to continue. Activating also rechecks products and branding."
        footer={
          <div className="installation-dialog-actions">
            <AppAction tone="secondary" onClick={closeDialog} disabled={isSubmitting}>Cancel</AppAction>
            <AppAction
              tone={targetStatus === 'DECOMMISSIONED' ? 'danger' : 'primary'}
              onClick={() => void confirm()}
              loading={isSubmitting}
            >
              Confirm
            </AppAction>
          </div>
        }
      >
        {targetStatus ? (
          <div className="installation-transition-dialog" id="lifecycle-reason">
            <p>
              <strong>{installation.name}</strong> will move from{' '}
              <InstallationStatusBadge status={installation.status} /> to{' '}
              <InstallationStatusBadge status={targetStatus} />
            </p>
            <AppTextarea
              label="Reason" placeholder="For example, contract ended on 30 June"
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

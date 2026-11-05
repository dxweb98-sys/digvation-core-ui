import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { ChevronDown } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type { Client, ClientStatus } from '../types/client';
import { ClientStatusBadge } from './client-status-badge';

const VALID_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

function getTransitionLabel(status: string) {
  return labelFor(status);
}

export function ClientLifecycleAction({
  client,
  isSubmitting,
  onTransition,
}: {
  client: Client;
  isSubmitting: boolean;
  onTransition: (targetStatus: ClientStatus, reason: string) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<ClientStatus | null>(null);
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
    if (!targetStatus) {
      return;
    }
    if (!reason.trim()) {
      setReasonError('Enter a reason.');
      focusFirstInvalid('lifecycle-reason');
      return;
    }
    try {
      await onTransition(targetStatus, reason);
      showToast({
        title: 'Client status updated',
        description: `${client.displayName} is now ${getTransitionLabel(targetStatus).toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'The status could not be changed. Try again.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown closeOnItemClick
        placement="top-end"
        contentRole="menu"
        contentClassName="client-lifecycle-menu"
        trigger={() => <AppAction tone="secondary" trailingIcon={ChevronDown}>More</AppAction>}
      >
        {VALID_TRANSITIONS[client.status].map((status) => (
          <button
            className={status === 'ARCHIVED' ? 'client-lifecycle-menu-item is-danger' : 'client-lifecycle-menu-item'}
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
        title="Change client status"
        description="Add a reason to continue."
        footer={
          <div className="client-dialog-actions">
            <AppAction tone="secondary" onClick={closeDialog} disabled={isSubmitting}>Cancel</AppAction>
            <AppAction tone={targetStatus === 'ARCHIVED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>
              Confirm
            </AppAction>
          </div>
        }
      >
        {targetStatus ? (
          <div className="client-transition-dialog" id="lifecycle-reason">
            <p>
              <strong>{client.displayName}</strong> will move from <ClientStatusBadge status={client.status} /> to <ClientStatusBadge status={targetStatus} />
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

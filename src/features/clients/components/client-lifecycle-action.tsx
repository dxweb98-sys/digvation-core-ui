import { DButton, DDialog, DDropdown, DTextarea, useToast } from '@digvation/ui';
import { useState } from 'react';
import type { Client, ClientStatus } from '../types/client';
import { ClientStatusBadge } from './client-status-badge';

const VALID_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

function getTransitionLabel(status: ClientStatus) {
  return status[0] + status.slice(1).toLowerCase();
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
      setReasonError('A reason is required for this lifecycle change.');
      return;
    }
    try {
      await onTransition(targetStatus, reason);
      showToast({
        title: 'Client lifecycle updated',
        description: `${client.displayName} is now ${getTransitionLabel(targetStatus).toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Lifecycle update failed',
        description: error instanceof Error ? error.message : 'The client lifecycle state could not be changed.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown
        placement="top-end"
        contentRole="menu"
        contentClassName="client-lifecycle-menu"
        trigger={() => <DButton variant="outline">More Actions</DButton>}
      >
        {VALID_TRANSITIONS[client.status].map((status) => (
          <button
            className={status === 'ARCHIVED' ? 'client-lifecycle-menu-item is-danger' : 'client-lifecycle-menu-item'}
            key={status}
            role="menuitem"
            type="button"
            onClick={() => setTargetStatus(status)}
          >
            Mark {getTransitionLabel(status)}
          </button>
        ))}
      </DDropdown>
      <DDialog
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Confirm client lifecycle change"
        description="This change affects the client lifecycle state. Provide a reason before continuing."
        footer={
          <div className="client-dialog-actions">
            <DButton variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</DButton>
            <DButton variant={targetStatus === 'ARCHIVED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>
              Confirm change
            </DButton>
          </div>
        }
      >
        {targetStatus ? (
          <div className="client-transition-dialog">
            <p>
              <strong>{client.displayName}</strong> will move from <ClientStatusBadge status={client.status} /> to <ClientStatusBadge status={targetStatus} />.
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

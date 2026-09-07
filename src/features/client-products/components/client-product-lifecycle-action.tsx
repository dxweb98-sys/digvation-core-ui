import { DButton, DDialog, DDropdown, DTextarea, useToast } from '@digvation-labs/ui';
import { useState } from 'react';
import type { ClientProductStatus, ClientProductSummary } from '../types/client-product';
import { ClientProductStatusBadge } from './client-product-status-badge';

const VALID_TRANSITIONS: Record<ClientProductStatus, ClientProductStatus[]> = {
  PROVISIONING: ['TRIAL', 'ACTIVE', 'CANCELLED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['PROVISIONING', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONING'],
};

const TRANSITION_LABELS: Record<ClientProductStatus, string> = {
  PROVISIONING: 'Re-provision',
  TRIAL: 'Start Trial',
  ACTIVE: 'Activate',
  SUSPENDED: 'Suspend',
  CANCELLED: 'Cancel',
  DECOMMISSIONED: 'Decommission',
};

export function ClientProductLifecycleAction({
  clientProduct,
  isSubmitting,
  onTransition,
  onCreateInstallation,
}: {
  clientProduct: ClientProductSummary;
  isSubmitting: boolean;
  onTransition: (targetStatus: ClientProductStatus, reason: string) => Promise<void>;
  onCreateInstallation?: () => void;
}) {
  const [targetStatus, setTargetStatus] = useState<ClientProductStatus | null>(null);
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
      showToast({ title: 'Product relationship updated', description: `${clientProduct.productName} is now ${targetStatus.toLowerCase()}.`, variant: 'success' });
      closeDialog();
    } catch (error) {
      showToast({ title: 'Lifecycle update failed', description: error instanceof Error ? error.message : 'The relationship lifecycle state could not be changed.', variant: 'danger' });
    }
  }

  return (
    <>
      <DDropdown placement="bottom-end" closeOnItemClick contentRole="menu" contentClassName="client-product-lifecycle-menu" trigger={() => <DButton variant="outline" size="sm" aria-label="Actions" title="Actions">•••</DButton>}>
        {onCreateInstallation ? <button className="client-product-lifecycle-menu-item" role="menuitem" type="button" onClick={onCreateInstallation}>Create Installation</button> : null}
        {VALID_TRANSITIONS[clientProduct.status].map((status) => <button className={status === 'CANCELLED' || status === 'DECOMMISSIONED' ? 'client-product-lifecycle-menu-item is-danger' : 'client-product-lifecycle-menu-item'} key={status} role="menuitem" type="button" onClick={() => setTargetStatus(status)}>{TRANSITION_LABELS[status]}</button>)}
      </DDropdown>
      <DDialog open={Boolean(targetStatus)} onClose={closeDialog} title="Confirm product relationship change" description="Provide a reason before changing the client product lifecycle state." footer={<div className="client-product-dialog-actions"><DButton variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</DButton><DButton variant={targetStatus === 'CANCELLED' || targetStatus === 'DECOMMISSIONED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>Confirm change</DButton></div>}>
        {targetStatus ? <div className="client-product-transition-dialog"><p><strong>{clientProduct.productName}</strong> will move from <ClientProductStatusBadge status={clientProduct.status} /> to <ClientProductStatusBadge status={targetStatus} />.</p><DTextarea label="Reason *" placeholder="Explain why this lifecycle state is changing." value={reason} error={reasonError} onChange={(value) => { setReason(value); if (reasonError) setReasonError(null); }} /></div> : null}
      </DDialog>
    </>
  );
}

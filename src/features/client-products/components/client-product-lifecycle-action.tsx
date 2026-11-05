import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { MoreHorizontal } from 'lucide-react';
import { AppAction, AppIconAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
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

const PARENT_ACTIVE_REQUIRED = new Set<ClientProductStatus>([
  'PROVISIONING',
  'TRIAL',
  'ACTIVE',
]);


export function ClientProductLifecycleAction({
  clientProduct,
  canBecomeEffective,
  isSubmitting,
  onTransition,
}: {
  clientProduct: ClientProductSummary;
  canBecomeEffective: boolean;
  isSubmitting: boolean;
  onTransition: (targetStatus: ClientProductStatus, reason: string) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<ClientProductStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const { showToast } = useToast();
  const availableTransitions = VALID_TRANSITIONS[clientProduct.status].filter(
    (status) => canBecomeEffective || !PARENT_ACTIVE_REQUIRED.has(status),
  );

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
      showToast({ title: 'Product status updated', description: `${clientProduct.productName} is now ${labelFor(targetStatus).toLowerCase()}.`, variant: 'success' });
      closeDialog();
    } catch (error) {
      showToast({ title: 'Status update failed', description: error instanceof Error ? error.message : 'The status could not be changed. Try again.', variant: 'danger' });
    }
  }

  return (
    <>
      <DDropdown placement="bottom-end" closeOnItemClick contentRole="menu" contentClassName="client-product-lifecycle-menu" trigger={() => <AppIconAction icon={MoreHorizontal} tone="secondary" label="Actions" title={availableTransitions.length ? 'Actions' : 'No status changes available'} disabled={availableTransitions.length === 0} />}>
        {availableTransitions.map((status) => <button className={status === 'CANCELLED' || status === 'DECOMMISSIONED' ? 'client-product-lifecycle-menu-item is-danger' : 'client-product-lifecycle-menu-item'} key={status} role="menuitem" type="button" onClick={() => setTargetStatus(status)}>{transitionLabel(status)}</button>)}
      </DDropdown>
      <AppDialog kind="confirm" open={Boolean(targetStatus)} onClose={closeDialog} title="Change product status" description="Add a reason to continue." footer={<div className="client-product-dialog-actions"><AppAction tone="secondary" onClick={closeDialog} disabled={isSubmitting}>Cancel</AppAction><AppAction tone={targetStatus === 'CANCELLED' || targetStatus === 'DECOMMISSIONED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>Confirm</AppAction></div>}>
        {targetStatus ? <div className="client-product-transition-dialog" id="lifecycle-reason"><p><strong>{clientProduct.productName}</strong> will move from <ClientProductStatusBadge status={clientProduct.status} /> to <ClientProductStatusBadge status={targetStatus} /></p><AppTextarea label="Reason" placeholder="For example, contract ended on 30 June" value={reason} error={reasonError} onBlur={() => { if (!reason.trim()) setReasonError('Enter a reason.'); }} onChange={(value) => { setReason(value); if (reasonError) setReasonError(null); }} /></div> : null}
      </AppDialog>
    </>
  );
}

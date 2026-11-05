import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { transitionLabel } from '../../../shared/labels/labels';
import { labelFor } from '../../../shared/labels/labels';
import { ChevronDown } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type { Product, ProductStatus } from '../types/product';
import { ProductStatusBadge } from './product-status-badge';

const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function formatStatus(status: string) {
  return labelFor(status);
}

export function ProductLifecycleAction({ product, isSubmitting, activationBlockedReason, onTransition }: { product: Product; isSubmitting: boolean; activationBlockedReason?: string; onTransition: (targetStatus: ProductStatus, reason: string) => Promise<void> }) {
  const [targetStatus, setTargetStatus] = useState<ProductStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { showToast } = useToast();

  function closeDialog() {
    if (!isSubmitting) {
      setTargetStatus(null);
      setReason('');
      setReasonError(null);
      setSubmitError(null);
    }
  }

  async function confirmTransition() {
    if (!targetStatus) return;
    if (!reason.trim()) {
      setReasonError('Enter a reason.');
      focusFirstInvalid('lifecycle-reason');
      return;
    }
    setSubmitError(null);
    try {
      await onTransition(targetStatus, reason);
      showToast({ title: 'Product status updated', description: `${product.name} is now ${formatStatus(targetStatus).toLowerCase()}.`, variant: 'success' });
      closeDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The status could not be changed. Try again.';
      setSubmitError(message);
      showToast({ title: 'Status update failed', description: message, variant: 'danger' });
    }
  }

  return (
    <>
      <DDropdown closeOnItemClick placement="top-end" contentRole="menu" contentClassName="product-lifecycle-menu" trigger={() => <AppAction tone="secondary" trailingIcon={ChevronDown}>More</AppAction>}>
        {VALID_TRANSITIONS[product.status].map((status) => {
          const blockedReason = status === 'ACTIVE' ? activationBlockedReason : undefined;
          return <button className={status === 'RETIRED' ? 'product-lifecycle-menu-item is-danger' : 'product-lifecycle-menu-item'} disabled={Boolean(blockedReason)} key={status} role="menuitem" type="button" onClick={() => setTargetStatus(status)}>{transitionLabel(status)}{blockedReason ? <span className="product-lifecycle-menu-reason">{blockedReason}</span> : null}</button>;
        })}
      </DDropdown>
      <AppDialog kind="confirm" open={Boolean(targetStatus)} onClose={closeDialog} title="Change product status" description="Add a reason to continue." footer={<div className="product-dialog-actions"><AppAction tone="secondary" onClick={closeDialog} disabled={isSubmitting}>Cancel</AppAction><AppAction tone={targetStatus === 'RETIRED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>Confirm</AppAction></div>}>
        {targetStatus ? <div className="product-transition-dialog" id="lifecycle-reason"><p><strong>{product.name}</strong> will move from <ProductStatusBadge status={product.status} /> to <ProductStatusBadge status={targetStatus} /></p><AppTextarea label="Reason" placeholder="For example, contract ended on 30 June" value={reason} error={reasonError} onBlur={() => { if (!reason.trim()) setReasonError('Enter a reason.'); }} onChange={(value) => { setReason(value); if (reasonError) setReasonError(null); }} />{submitError ? <p className="product-form-error" role="alert">{submitError}</p> : null}</div> : null}
      </AppDialog>
    </>
  );
}

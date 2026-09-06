import { DButton, DDialog, DDropdown, DTextarea, useToast } from '@digvation-labs/ui';
import { useState } from 'react';
import type { Product, ProductStatus } from '../types/product';
import { ProductStatusBadge } from './product-status-badge';

const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function formatStatus(status: ProductStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function ProductLifecycleAction({ product, isSubmitting, onTransition }: { product: Product; isSubmitting: boolean; onTransition: (targetStatus: ProductStatus, reason: string) => Promise<void> }) {
  const [targetStatus, setTargetStatus] = useState<ProductStatus | null>(null);
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
      showToast({ title: 'Product lifecycle updated', description: `${product.name} is now ${formatStatus(targetStatus).toLowerCase()}.`, variant: 'success' });
      closeDialog();
    } catch (error) {
      showToast({ title: 'Lifecycle update failed', description: error instanceof Error ? error.message : 'The product lifecycle state could not be changed.', variant: 'danger' });
    }
  }

  return (
    <>
      <DDropdown placement="top-end" contentRole="menu" contentClassName="product-lifecycle-menu" trigger={() => <DButton variant="outline">More Actions</DButton>}>
        {VALID_TRANSITIONS[product.status].map((status) => <button className={status === 'RETIRED' ? 'product-lifecycle-menu-item is-danger' : 'product-lifecycle-menu-item'} key={status} role="menuitem" type="button" onClick={() => setTargetStatus(status)}>Mark {formatStatus(status)}</button>)}
      </DDropdown>
      <DDialog open={Boolean(targetStatus)} onClose={closeDialog} title="Confirm product lifecycle change" description="This change affects the product lifecycle state. Provide a reason before continuing." footer={<div className="product-dialog-actions"><DButton variant="outline" onClick={closeDialog} disabled={isSubmitting}>Cancel</DButton><DButton variant={targetStatus === 'RETIRED' ? 'danger' : 'primary'} onClick={() => void confirmTransition()} loading={isSubmitting}>Confirm change</DButton></div>}>
        {targetStatus ? <div className="product-transition-dialog"><p><strong>{product.name}</strong> will move from <ProductStatusBadge status={product.status} /> to <ProductStatusBadge status={targetStatus} />.</p><DTextarea label="Reason *" placeholder="Explain why this lifecycle state is changing." value={reason} error={reasonError} onChange={(value) => { setReason(value); if (reasonError) setReasonError(null); }} /></div> : null}
      </DDialog>
    </>
  );
}

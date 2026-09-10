import { DButton, DDialog, DDropdown, DTextarea, useToast } from '@digvation/ui';
import { useState } from 'react';
import type {
  Product,
  ProductFeature,
  ProductFeatureStatus,
} from '../types/product';
import { ProductStatusBadge } from './product-status-badge';

const VALID_TRANSITIONS: Record<ProductFeatureStatus, ProductFeatureStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function formatStatus(status: ProductFeatureStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function ProductFeatureLifecycleAction({
  product,
  feature,
  isSubmitting,
  onTransition,
}: {
  product: Product;
  feature: ProductFeature;
  isSubmitting: boolean;
  onTransition: (targetStatus: ProductFeatureStatus, reason: string) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<ProductFeatureStatus | null>(null);
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
        title: 'Product feature lifecycle updated',
        description: `${feature.name} is now ${formatStatus(targetStatus).toLowerCase()}.`,
        variant: 'success',
      });
      closeDialog();
    } catch (error) {
      showToast({
        title: 'Lifecycle update failed',
        description:
          error instanceof Error
            ? error.message
            : 'The product feature lifecycle state could not be changed.',
        variant: 'danger',
      });
    }
  }

  return (
    <>
      <DDropdown
        placement="bottom-end"
        contentRole="menu"
        contentClassName="product-lifecycle-menu"
        trigger={() => <DButton variant="outline">Lifecycle</DButton>}
      >
        {VALID_TRANSITIONS[feature.status].map((status) => {
          const disabled = status === 'ACTIVE' && product.status !== 'ACTIVE';
          return (
            <button
              className={
                status === 'RETIRED'
                  ? 'product-lifecycle-menu-item is-danger'
                  : 'product-lifecycle-menu-item'
              }
              disabled={disabled}
              key={status}
              role="menuitem"
              type="button"
              onClick={() => setTargetStatus(status)}
            >
              Mark {formatStatus(status)}
            </button>
          );
        })}
      </DDropdown>
      <DDialog
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Confirm product feature lifecycle change"
        description="ProductFeature lifecycle is independent from Client feature entitlement. Provide a reason before continuing."
        footer={
          <div className="product-dialog-actions">
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
          <div className="product-transition-dialog">
            <p>
              <strong>{feature.name}</strong> will move from{' '}
              <ProductStatusBadge status={feature.status} /> to{' '}
              <ProductStatusBadge status={targetStatus} />.
            </p>
            <DTextarea
              label="Reason *"
              placeholder="Explain why this feature lifecycle state is changing."
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

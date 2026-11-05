import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { transitionLabel } from '../../../shared/labels/labels';
import { labelFor } from '../../../shared/labels/labels';
import { ChevronDown } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DDropdown, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
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

function formatStatus(status: string) {
  return labelFor(status);
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
      setReasonError('Enter a reason.');
      focusFirstInvalid('lifecycle-reason');
      return;
    }
    try {
      await onTransition(targetStatus, reason);
      showToast({
        title: 'Feature status updated',
        description: `${feature.name} is now ${formatStatus(targetStatus).toLowerCase()}.`,
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
        contentClassName="product-lifecycle-menu"
        trigger={() => <AppAction size="sm" tone="secondary" trailingIcon={ChevronDown}>Status</AppAction>}
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
              {transitionLabel(status)}
            </button>
          );
        })}
      </DDropdown>
      <AppDialog kind="confirm"
        open={Boolean(targetStatus)}
        onClose={closeDialog}
        title="Change feature status"
        description="Add a reason to continue."
        footer={
          <div className="product-dialog-actions">
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
          <div className="product-transition-dialog" id="lifecycle-reason">
            <p>
              <strong>{feature.name}</strong> will move from{' '}
              <ProductStatusBadge status={feature.status} /> to{' '}
              <ProductStatusBadge status={targetStatus} />
            </p>
            <AppTextarea
              label="Reason"
              placeholder="For example, feature replaced by POS sales"
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

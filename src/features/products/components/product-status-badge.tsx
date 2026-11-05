import { labelFor } from '../../../shared/labels/labels';
import { DBadge } from '@digvation/ui';
import type { ProductStatus } from '../types/product';

const STATUS_VARIANTS: Record<ProductStatus, 'default' | 'success' | 'danger'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  RETIRED: 'default',
};

function formatStatus(status: string) {
  return labelFor(status);
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot>{formatStatus(status)}</DBadge>;
}

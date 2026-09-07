import { DBadge } from '@digvation/ui';
import type { ProductStatus } from '../types/product';

const STATUS_VARIANTS: Record<ProductStatus, 'default' | 'success' | 'danger'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  RETIRED: 'danger',
};

function formatStatus(status: ProductStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot>{formatStatus(status)}</DBadge>;
}

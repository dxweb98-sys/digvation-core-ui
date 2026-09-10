import { DBadge } from '@digvation/ui';
import type { CapabilityStatus } from '../types/capability';

const STATUS_VARIANTS: Record<CapabilityStatus, 'default' | 'success' | 'danger'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  RETIRED: 'danger',
};

function formatStatus(status: CapabilityStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot>{formatStatus(status)}</DBadge>;
}

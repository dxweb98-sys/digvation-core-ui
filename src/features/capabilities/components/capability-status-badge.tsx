import { labelFor } from '../../../shared/labels/labels';
import { DBadge } from '@digvation/ui';
import type { CapabilityStatus } from '../types/capability';

const STATUS_VARIANTS: Record<CapabilityStatus, 'default' | 'success' | 'danger'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  RETIRED: 'default',
};

function formatStatus(status: string) {
  return labelFor(status);
}

export function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot>{formatStatus(status)}</DBadge>;
}

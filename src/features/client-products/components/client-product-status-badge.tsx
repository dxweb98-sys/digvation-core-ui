import { labelFor } from '../../../shared/labels/labels';
import { DBadge } from '@digvation/ui';
import type { ClientProductStatus } from '../types/client-product';

const STATUS_VARIANTS: Record<ClientProductStatus, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  PROVISIONING: 'info',
  TRIAL: 'info',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  CANCELLED: 'danger',
  DECOMMISSIONED: 'default',
};

function formatStatus(status: string) {
  return labelFor(status);
}

export function ClientProductStatusBadge({ status }: { status: ClientProductStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot dotClassName={status === 'PROVISIONING' ? 'status-dot-live' : undefined}>{formatStatus(status)}</DBadge>;
}

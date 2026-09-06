import { DBadge } from '@digvation-labs/ui';
import type { ClientProductStatus } from '../types/client-product';

const STATUS_VARIANTS: Record<ClientProductStatus, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  PROVISIONING: 'info',
  TRIAL: 'info',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  CANCELLED: 'danger',
  DECOMMISSIONED: 'default',
};

function formatStatus(status: ClientProductStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function ClientProductStatusBadge({ status }: { status: ClientProductStatus }) {
  return <DBadge variant={STATUS_VARIANTS[status]} dot>{formatStatus(status)}</DBadge>;
}

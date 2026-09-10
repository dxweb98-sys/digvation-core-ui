import { DBadge } from '@digvation/ui';

import type { ClientCapabilityStatus } from '../types/client-capability';

const STATUS_VARIANTS: Record<
  ClientCapabilityStatus,
  'info' | 'success' | 'warning' | 'danger' | 'default'
> = {
  PROVISIONING: 'info',
  TRIAL: 'info',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  CANCELLED: 'danger',
  DECOMMISSIONED: 'default',
};

function formatStatus(status: ClientCapabilityStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function ClientCapabilityStatusBadge({
  status,
}: {
  status: ClientCapabilityStatus;
}) {
  return (
    <DBadge variant={STATUS_VARIANTS[status]} dot>
      {formatStatus(status)}
    </DBadge>
  );
}

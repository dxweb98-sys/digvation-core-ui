import { DBadge, type BadgeVariant } from '@digvation/ui';
import type { ClientStatus } from '../types/client';

const CLIENT_STATUS_VARIANTS: Record<ClientStatus, BadgeVariant> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ARCHIVED: 'secondary',
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <DBadge variant={CLIENT_STATUS_VARIANTS[status]} dot>{status}</DBadge>;
}

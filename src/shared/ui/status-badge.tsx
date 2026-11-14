import { DBadge, type BadgeVariant } from '@digvation/ui';
import { labelFor } from '../labels/labels';

const VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  CONFIRMED: 'success',
  PAID: 'success',
  RECORDED: 'success',
  ISSUED: 'info',
  PUBLISHED: 'success',
  ACCEPTED: 'success',
  SENT: 'info',
  OPEN: 'info',
  PARTIALLY_PAID: 'warning',
  OVERDUE: 'danger',
  PENDING: 'warning',
  PROPOSED: 'warning',
  DRAFT: 'secondary',
  PLANNED: 'secondary',
  SUSPENDED: 'warning',
  DEPRECATED: 'warning',
  INACTIVE: 'secondary',
  ARCHIVED: 'secondary',
  RETIRED: 'secondary',
  ENDED: 'secondary',
  CLOSED: 'secondary',
  EXPIRED: 'secondary',
  CANCELLED: 'danger',
  REVOKED: 'danger',
  REVERSED: 'danger',
  VOID: 'danger',
  VOIDED: 'danger',
  FAILED: 'danger',
};

export function statusVariant(status: string): BadgeVariant {
  return VARIANTS[status] ?? 'outline';
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <DBadge variant={statusVariant(status)} dot>
      {labelFor(status)}
    </DBadge>
  );
}

import { DBadge, type BadgeVariant } from '@digvation-labs/ui';
import type {
  AttentionSeverity,
  DeploymentStatus,
  OperationalHealth,
} from '../types/dashboard';

const HEALTH_VARIANTS: Record<OperationalHealth, BadgeVariant> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  CRITICAL: 'danger',
  UNKNOWN: 'secondary',
  MAINTENANCE: 'info',
};

const SEVERITY_VARIANTS: Record<AttentionSeverity, BadgeVariant> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'danger',
};

const DEPLOYMENT_VARIANTS: Record<DeploymentStatus, BadgeVariant> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
};

export function OperationalHealthBadge({
  status,
}: {
  status: OperationalHealth;
}) {
  return (
    <DBadge variant={HEALTH_VARIANTS[status]} dot>
      {status}
    </DBadge>
  );
}

export function AttentionSeverityBadge({
  severity,
}: {
  severity: AttentionSeverity;
}) {
  return (
    <DBadge variant={SEVERITY_VARIANTS[severity]} dot>
      {severity}
    </DBadge>
  );
}

export function DeploymentStatusBadge({
  status,
}: {
  status: DeploymentStatus;
}) {
  return (
    <DBadge variant={DEPLOYMENT_VARIANTS[status]} dot>
      {status.replace('_', ' ')}
    </DBadge>
  );
}

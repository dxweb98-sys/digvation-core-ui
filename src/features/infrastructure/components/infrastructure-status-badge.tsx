import { DBadge, type BadgeVariant } from '@digvation/ui';
import type { InfrastructureLifecycleStatus } from '../types/infrastructure';
const CONFIG: Record<InfrastructureLifecycleStatus, { label: string; variant: BadgeVariant }> = { REGISTERED: { label: 'Registered', variant: 'default' }, ACTIVE: { label: 'Active', variant: 'success' }, MAINTENANCE: { label: 'Maintenance', variant: 'warning' }, RETIRED: { label: 'Retired', variant: 'danger' } };
export function InfrastructureStatusBadge({ status }: { status: InfrastructureLifecycleStatus }) { const config = CONFIG[status]; return <DBadge variant={config.variant}>{config.label}</DBadge>; }

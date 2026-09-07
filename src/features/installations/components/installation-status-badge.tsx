import { DBadge } from '@digvation/ui';
import type { InstallationStatus } from '../types/installation';
const VARIANTS: Record<InstallationStatus, 'info' | 'success' | 'warning' | 'default'> = { PROVISIONING: 'info', ACTIVE: 'success', SUSPENDED: 'warning', DECOMMISSIONED: 'default' };
export function InstallationStatusBadge({ status }: { status: InstallationStatus }) { return <DBadge variant={VARIANTS[status]} dot>{status[0] + status.slice(1).toLowerCase()}</DBadge>; }

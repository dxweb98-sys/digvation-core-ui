/**
 * The one place constant values become words. Codes operators actually use
 * (product, capability, client codes and IDs) are shown as they are, in monospace.
 */
const LABELS: Record<string, string> = {
  ACKNOWLEDGED: 'Acknowledged',
  ACTIVE: 'Active',
  ANNUAL: 'Annual',
  APPLICATION: 'Application',
  ARCHIVED: 'Archived',
  BILLING: 'Billing',
  CACHE: 'Cache',
  CANCELLED: 'Cancelled',
  CLIENT: 'Client',
  COMMERCIAL: 'Commercial',
  COMPLETED: 'Completed',
  COMPLIMENTARY: 'Complimentary',
  CO_TERM_PRORATED: 'Prorated to term end',
  CRITICAL: 'Critical',
  CUSTOM: 'Custom',
  DATABASE: 'Database',
  DECOMMISSIONED: 'Decommissioned',
  DEDICATED: 'Dedicated',
  DEGRADED: 'Degraded',
  DEVELOPMENT: 'Development',
  DIGVATION: 'Digvation',
  DOWN: 'Down',
  DRAFT: 'Draft',
  ENTER_MAINTENANCE: 'Enter maintenance',
  EXIT_MAINTENANCE: 'Exit maintenance',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
  GRANDFATHERED: 'Grandfathered',
  HEALTHY: 'Healthy',
  INACTIVE: 'Inactive',
  INFO: 'Info',
  INSTALLATION: 'Installation',
  IN_PROGRESS: 'In progress',
  MAINTENANCE: 'Maintenance',
  MANUAL: 'Manual',
  MONTHLY: 'Monthly',
  NEGOTIATED: 'Negotiated',
  NONE: 'None',
  OPEN: 'Open',
  PENDING: 'Pending',
  PRIMARY: 'Primary',
  PRODUCTION: 'Production',
  PROMOTIONAL: 'Promotional',
  PROVISIONING: 'Provisioning',
  QUARTERLY: 'Quarterly',
  REDEPLOY: 'Redeploy',
  REGISTERED: 'Registered',
  REJECTED: 'Rejected',
  REQUESTED: 'Requested',
  RESOLVED: 'Resolved',
  RESTART: 'Restart',
  RETIRED: 'Retired',
  REVERSE_PROXY: 'Reverse proxy',
  REVOKED: 'Revoked',
  RUNNING: 'Running',
  SEMI_ANNUAL: 'Semi-annual',
  SHARED: 'Shared',
  STAGING: 'Staging',
  START: 'Start',
  STOP: 'Stop',
  STOPPED: 'Stopped',
  STORAGE: 'Storage',
  SUCCESS: 'Success',
  SUSPENDED: 'Suspended',
  TECHNICAL: 'Technical',
  TRIAL: 'Trial',
  UNKNOWN: 'Unknown',
  WARNING: 'Warning',
  WHITE_LABEL: 'White label',
};

/** Human label for a constant value. An unmapped value is still made readable. */
export function labelFor(value: string | null | undefined): string {
  if (!value) return '';
  const known = LABELS[value];
  if (known) return known;
  const words = value.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const TRANSITIONS: Record<string, string> = {
  ACTIVE: 'Activate',
  ARCHIVED: 'Archive',
  CANCELLED: 'Cancel',
  DECOMMISSIONED: 'Decommission',
  DRAFT: 'Return to draft',
  PROVISIONING: 'Return to provisioning',
  RETIRED: 'Retire',
  SUSPENDED: 'Suspend',
  TRIAL: 'Start trial',
};

/** The action that moves something into a status. */
export function transitionLabel(status: string): string {
  return TRANSITIONS[status] ?? labelFor(status);
}

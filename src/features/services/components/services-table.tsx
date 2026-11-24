import { DBadge, type TableColumn } from '@digvation/ui';
import { formatInstant } from '../../../shared/format/date';
import { labelFor } from '../../../shared/labels/labels';
import { Code, Identity } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Service } from '../services-api';

export const SERVICE_STATUS_OPTIONS = [
  { value: 'PROVISIONING', label: labelFor('PROVISIONING') },
  { value: 'TRIAL', label: labelFor('TRIAL') },
  { value: 'ACTIVE', label: labelFor('ACTIVE') },
  { value: 'SUSPENDED', label: labelFor('SUSPENDED') },
  { value: 'CANCELLED', label: labelFor('CANCELLED') },
  { value: 'DECOMMISSIONED', label: labelFor('DECOMMISSIONED') },
];

export const SERVICE_COLUMNS: TableColumn<Service>[] = [
  {
    key: 'product',
    label: 'Product',
    render: (service) => (
      <RecordButton>
        <Identity primary={service.product.name} secondary={service.product.code} />
      </RecordButton>
    ),
  },
  { key: 'brand', label: 'Brand', render: (service) => <Identity primary={service.brand.name} secondary={service.brand.code} /> },
  { key: 'status', label: 'Status', render: (service) => <StatusBadge status={service.status} /> },
  {
    key: 'features',
    label: 'Features',
    render: (service) =>
      service.features.length === 0 ? (
        '—'
      ) : (
        <span className="app-page-actions">
          {service.features.map((feature) => (
            <Code key={feature.id}>{feature.code}</Code>
          ))}
        </span>
      ),
  },
  {
    key: 'add_ons',
    label: 'Add-ons',
    render: (service) =>
      service.add_ons.length === 0 ? (
        '—'
      ) : (
        <span className="app-page-actions">
          {service.add_ons.map((addOn) => (
            <DBadge key={addOn.id} variant="outline">
              {addOn.name}
            </DBadge>
          ))}
        </span>
      ),
  },
  { key: 'updated_at', label: 'Diperbarui', render: (service) => formatInstant(service.updated_at) },
];

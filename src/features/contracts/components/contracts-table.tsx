import type { TableColumn } from '@digvation/ui';
import { formatBusinessDate } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { labelFor } from '../../../shared/labels/labels';
import { Identity } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import type { Contract } from '../contracts-api';

export const CONTRACT_STATUS_OPTIONS = ['PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map(
  (value) => ({ value, label: labelFor(value) }),
);

function currentTerm(contract: Contract) {
  return (
    contract.terms.find((term) => term.status === 'ACTIVE') ??
    contract.terms.find((term) => term.status === 'SCHEDULED') ??
    contract.terms.at(-1)
  );
}

export const CONTRACT_COLUMNS: TableColumn<Contract>[] = [
  {
    key: 'service',
    label: 'Service',
    render: (contract) => (
      <RecordButton>
        <Identity primary={`${contract.service.product.name} · ${contract.service.brand.name}`} secondary={contract.service.client.display_name} />
      </RecordButton>
    ),
  },
  { key: 'status', label: 'Status', render: (contract) => <StatusBadge status={contract.status} /> },
  {
    key: 'terms',
    label: 'Term berjalan',
    render: (contract) => {
      const term = currentTerm(contract);
      return term ? `${formatBusinessDate(term.starts_on)} – ${formatBusinessDate(term.ends_on)}` : '—';
    },
  },
  {
    key: 'agreed',
    label: 'Disepakati',
    align: 'right',
    render: (contract) => {
      const term = currentTerm(contract);
      return term ? (
        <span className="app-amount">
          {formatMoney(term.agreed_amount, term.currency)} / {labelFor(term.billing_cycle).toLowerCase()}
        </span>
      ) : (
        '—'
      );
    },
  },
  { key: 'contract_reference', label: 'Referensi', render: (contract) => contract.contract_reference ?? '—' },
];

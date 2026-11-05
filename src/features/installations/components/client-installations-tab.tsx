import { RecordButton } from '../../../shared/ui/record-button';
import { labelFor } from '../../../shared/labels/labels';
import {
  DConnectionError,
  DDataTable,
  DEmptyState,
  type TableColumn,
} from '@digvation/ui';
import { ContentSkeleton } from '../../../shared/ui/content-skeleton';
import { useState } from 'react';
import { useClientInstallations } from '../hooks/use-installations';
import type { InstallationSummary } from '../types/installation';
import { InstallationDetailDialog } from './installation-detail-dialog';
import { InstallationStatusBadge } from './installation-status-badge';

const COLUMNS: TableColumn<InstallationSummary>[] = [
  {
    key: 'name',
    label: 'Installation',
    render: (installation) => (
      <div className="installation-identity">
        <RecordButton><strong>{installation.name}</strong></RecordButton>
        <code>{installation.code}</code>
      </div>
    ),
  },
  {
    key: 'products',
    label: 'Products',
    render: (installation) => installation.products.map((product) => product.productName).join(', '),
  },
  { key: 'environment', label: 'Environment', render: (installation) => labelFor(installation.environment) },
  { key: 'deploymentMode', label: 'Deployment', render: (installation) => labelFor(installation.deploymentMode) },
  { key: 'branding', label: 'Branding', render: (installation) => labelFor(installation.branding.mode) },
  {
    key: 'status',
    label: 'Status',
    render: (installation) => <InstallationStatusBadge status={installation.status} />,
  },
];

export function ClientInstallationsTab({ clientId }: { clientId: string }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const installationsQuery = useClientInstallations(clientId);

  if (installationsQuery.isPending) {
    return <ContentSkeleton label="Loading installations" rows={3} />;
  }
  if (installationsQuery.isError) {
    return (
      <DConnectionError
        title="Installations unavailable"
        message="Client installations could not be loaded."
        detail={installationsQuery.error.message}
        onRetry={() => void installationsQuery.refetch()}
      />
    );
  }

  return (
    <>
      <div className="client-installations-tab">
        {installationsQuery.data.length === 0 ? (
          <DEmptyState
            title="No installations"
            description="Add an installation from the Installations page."
          />
        ) : (
          <DDataTable
            columns={COLUMNS}
            data={installationsQuery.data}
            rowKey="id"
            onRowClick={(installation) => setDetailId(installation.id)}
          />
        )}
      </div>
      {detailId ? (
        <InstallationDetailDialog
          installationId={detailId}
          open
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </>
  );
}

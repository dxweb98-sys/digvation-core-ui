import { DButton, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, type TableColumn } from '@digvation-labs/ui';
import { useState } from 'react';
import { useClientProducts } from '../hooks/use-client-products';
import { useClientProductStatusTransition } from '../hooks/use-client-product-mutations';
import type { ClientProductStatus, ClientProductSummary } from '../types/client-product';
import { AssignProductDialog } from './assign-product-dialog';
import { ClientProductLifecycleAction } from './client-product-lifecycle-action';
import { ClientProductStatusBadge } from './client-product-status-badge';
import { InstallationFormDialog } from '../../installations/components/installation-form-dialog';
import '../client-products.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

const COLUMNS: TableColumn<ClientProductSummary>[] = [
  { key: 'productName', label: 'Product', render: (relationship) => <div className="client-product-identity"><strong>{relationship.productName}</strong><code>{relationship.productCode}</code></div> },
  { key: 'status', label: 'Status', render: (relationship) => <ClientProductStatusBadge status={relationship.status} /> },
  { key: 'statusChangedAt', label: 'Status changed', render: (relationship) => formatDate(relationship.statusChangedAt) },
  { key: 'updatedAt', label: 'Updated', render: (relationship) => formatDate(relationship.updatedAt) },
];

export function ClientProductsTab({ clientId }: { clientId: string }) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [clientProductForInstallation, setClientProductForInstallation] = useState<ClientProductSummary | null>(null);
  const clientProductsQuery = useClientProducts(clientId);
  const transitionClientProductStatus = useClientProductStatusTransition();

  if (clientProductsQuery.isPending) return <div className="client-product-tab-state"><DLoadingIndicator label="Loading product relationships" /></div>;
  if (clientProductsQuery.isError) return <DConnectionError title="Product relationships unavailable" message="Client product relationships could not be loaded." detail={clientProductsQuery.error.message} onRetry={() => void clientProductsQuery.refetch()} />;

  const relationships = clientProductsQuery.data;
  async function transitionStatus(clientProductId: string, targetStatus: ClientProductStatus, reason: string) {
    await transitionClientProductStatus.mutateAsync({ clientProductId, targetStatus, reason });
  }

  return (
    <div className="client-products-tab">
      {relationships.length === 0 ? <DEmptyState title="No products assigned" description="Assign a product to establish the first client product relationship." action={<DButton onClick={() => setIsAssignDialogOpen(true)}>Assign Product</DButton>} /> : <DDataTable columns={COLUMNS} data={relationships} rowKey="id" headerActions={<DButton onClick={() => setIsAssignDialogOpen(true)}>Assign Product</DButton>} actions={(relationship) => <ClientProductLifecycleAction clientProduct={relationship} isSubmitting={transitionClientProductStatus.isPending} onCreateInstallation={() => setClientProductForInstallation(relationship)} onTransition={(targetStatus, reason) => transitionStatus(relationship.id, targetStatus, reason)} />} />}
      <AssignProductDialog clientId={clientId} open={isAssignDialogOpen} onClose={() => setIsAssignDialogOpen(false)} />
      <InstallationFormDialog open={clientProductForInstallation !== null} mode="create" initialClientProduct={clientProductForInstallation ? { id: clientProductForInstallation.id, label: `${clientProductForInstallation.productName} · ${clientProductForInstallation.productCode}` } : undefined} onClose={() => setClientProductForInstallation(null)} />
    </div>
  );
}

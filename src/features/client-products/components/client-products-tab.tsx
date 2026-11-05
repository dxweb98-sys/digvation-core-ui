import { Plus, SlidersHorizontal } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DConnectionError, DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
import { ContentSkeleton } from '../../../shared/ui/content-skeleton';
import { useState } from 'react';

import { ClientCapabilitiesSection } from '../../client-capabilities/components/client-capabilities-section';
import { useClientProducts } from '../hooks/use-client-products';
import { useClientProductStatusTransition } from '../hooks/use-client-product-mutations';
import type {
  ClientProductStatus,
  ClientProductSummary,
} from '../types/client-product';
import { AssignProductDialog } from './assign-product-dialog';
import { ClientProductFeaturesDialog } from './client-product-features-dialog';
import { ClientProductLifecycleAction } from './client-product-lifecycle-action';
import { ClientProductStatusBadge } from './client-product-status-badge';
import '../client-products.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

const COLUMNS: TableColumn<ClientProductSummary>[] = [
  {
    key: 'productName',
    label: 'Product',
    render: (relationship) => (
      <div className="client-product-identity">
        <strong>{relationship.productName}</strong>
        <code>{relationship.productCode}</code>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (relationship) => (
      <ClientProductStatusBadge status={relationship.status} />
    ),
  },
  {
    key: 'statusChangedAt',
    label: 'Status changed',
    render: (relationship) => formatDate(relationship.statusChangedAt),
  },
  {
    key: 'updatedAt',
    label: 'Updated',
    render: (relationship) => formatDate(relationship.updatedAt),
  },
];

export function ClientProductsTab({
  clientId,
  canManageComposition,
}: {
  clientId: string;
  canManageComposition: boolean;
}) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [featureRelationship, setFeatureRelationship] =
    useState<ClientProductSummary | null>(null);
  const clientProductsQuery = useClientProducts(clientId);
  const transitionClientProductStatus = useClientProductStatusTransition();

  if (clientProductsQuery.isPending) {
    return (
      <ContentSkeleton label="Loading products" rows={3} />
    );
  }
  if (clientProductsQuery.isError) {
    return (
      <DConnectionError
        title="Products unavailable"
        message="Products could not be loaded."
        detail={clientProductsQuery.error.message}
        onRetry={() => void clientProductsQuery.refetch()}
      />
    );
  }

  const relationships = clientProductsQuery.data;

  async function transitionStatus(
    clientProductId: string,
    targetStatus: ClientProductStatus,
    reason: string,
  ) {
    await transitionClientProductStatus.mutateAsync({
      clientProductId,
      targetStatus,
      reason,
    });
  }

  const assignProductButton = (
    <AppAction icon={Plus} tone="secondary"
      disabled={!canManageComposition}
      onClick={() => setIsAssignDialogOpen(true)}
    >
      Assign product
    </AppAction>
  );

  return (
    <div className="client-products-tab">
      <div className="client-composition-heading">
        <div className="client-composition-copy">
          <strong>Products</strong>
          </div>
      </div>

      {!canManageComposition ? (
        <p className="client-composition-warning">
          Activate the client to add products, features or capabilities.
        </p>
      ) : null}

      {relationships.length === 0 ? (
        <DEmptyState
          title="No products assigned"
          description={
            canManageComposition
              ? 'Assign a product to this client.'
              : 'Activate the client before assigning its first product.'
          }
          action={assignProductButton}
        />
      ) : (
        <DDataTable
          columns={COLUMNS}
          data={relationships}
          rowKey="id"
          headerActions={assignProductButton}
          actions={(relationship) => (
            <div className="client-product-row-actions">
              <AppAction icon={SlidersHorizontal} size="sm" tone="secondary"
                disabled={
                  !canManageComposition ||
                  relationship.status === 'CANCELLED' ||
                  relationship.status === 'DECOMMISSIONED'
                }
                onClick={() => setFeatureRelationship(relationship)}
              >
                Features
              </AppAction>
              <ClientProductLifecycleAction
                clientProduct={relationship}
                canBecomeEffective={canManageComposition}
                isSubmitting={transitionClientProductStatus.isPending}
                onTransition={(targetStatus, reason) =>
                  transitionStatus(relationship.id, targetStatus, reason)
                }
              />
            </div>
          )}
        />
      )}

      <ClientCapabilitiesSection
        clientId={clientId}
        clientProducts={relationships}
        canAssignCapabilities={canManageComposition}
      />

      <AssignProductDialog
        clientId={clientId}
        open={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
      />
      <ClientProductFeaturesDialog
        relationship={featureRelationship}
        open={featureRelationship !== null}
        onClose={() => setFeatureRelationship(null)}
      />
    </div>
  );
}

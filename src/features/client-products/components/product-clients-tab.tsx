import { DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, type TableColumn } from '@digvation-labs/ui';
import { useProductClients } from '../hooks/use-client-products';
import type { ProductClientSummary } from '../types/client-product';
import { ClientProductStatusBadge } from './client-product-status-badge';
import '../client-products.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

const COLUMNS: TableColumn<ProductClientSummary>[] = [
  { key: 'clientDisplayName', label: 'Client', render: (relationship) => <div className="client-product-identity"><strong>{relationship.clientDisplayName}</strong><code>{relationship.clientCode}</code></div> },
  { key: 'status', label: 'Relationship status', render: (relationship) => <ClientProductStatusBadge status={relationship.status} /> },
  { key: 'statusChangedAt', label: 'Status changed', render: (relationship) => formatDate(relationship.statusChangedAt) },
  { key: 'updatedAt', label: 'Updated', render: (relationship) => formatDate(relationship.updatedAt) },
];

export function ProductClientsTab({ productId }: { productId: string }) {
  const productClientsQuery = useProductClients(productId);

  if (productClientsQuery.isPending) return <div className="client-product-tab-state"><DLoadingIndicator label="Loading client relationships" /></div>;
  if (productClientsQuery.isError) return <DConnectionError title="Client relationships unavailable" message="Product client relationships could not be loaded." detail={productClientsQuery.error.message} onRetry={() => void productClientsQuery.refetch()} />;
  if (productClientsQuery.data.length === 0) return <DEmptyState title="No clients using this product" description="Client product relationships will appear here when a product is assigned." />;

  return <DDataTable columns={COLUMNS} data={productClientsQuery.data} rowKey="id" />;
}

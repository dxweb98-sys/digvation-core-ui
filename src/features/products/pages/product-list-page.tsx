import { DButton, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DStatusFilter, type TableAction, type TableColumn } from '@digvation/ui';
import { useState } from 'react';
import { ProductDetailDialog } from '../components/product-detail-dialog';
import { ProductFormDialog } from '../components/product-form-dialog';
import { ProductStatusBadge } from '../components/product-status-badge';
import { useProductList } from '../hooks/use-product-list';
import type { ProductListItem, ProductListQuery, ProductStatus } from '../types/product';
import '../products.css';

const PAGE_LIMIT = 10;
const PRODUCT_STATUS_OPTIONS = [{ value: 'DRAFT', label: 'Draft' }, { value: 'ACTIVE', label: 'Active' }, { value: 'RETIRED', label: 'Retired' }];

const PRODUCT_COLUMNS: TableColumn<ProductListItem>[] = [
  { key: 'name', label: 'Product', render: (product) => <div className="product-table-identity"><strong>{product.name}</strong><span>{product.description ?? 'No description recorded'}</span></div> },
  { key: 'code', label: 'Code', render: (product) => <code className="product-code">{product.code}</code> },
  { key: 'status', label: 'Status', render: (product) => <ProductStatusBadge status={product.status} /> },
  { key: 'featureCount', label: 'Features', render: (product) => `${product.featureCount} feature${product.featureCount === 1 ? '' : 's'}` },
  { key: 'clientCount', label: 'Clients', render: (product) => `${product.clientCount} client${product.clientCount === 1 ? '' : 's'}` },
  { key: 'updatedAt', label: 'Updated', render: (product) => formatProductDate(product.updatedAt) },
];

function formatProductDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ProductListPage() {
  const [query, setQuery] = useState<ProductListQuery>({ search: '', status: 'ALL', page: 1, limit: PAGE_LIMIT });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ProductListItem | null>(null);
  const productQuery = useProductList(query);

  function updateQuery(nextQuery: Partial<ProductListQuery>) {
    setQuery((currentQuery) => ({ ...currentQuery, ...nextQuery, page: nextQuery.page ?? (nextQuery.search !== undefined || nextQuery.status !== undefined ? 1 : currentQuery.page) }));
  }

  if (productQuery.isPending) return <div className="products-page-state"><DLoadingIndicator label="Loading products" /></div>;
  if (productQuery.isError) return <div className="products-page-state"><DConnectionError title="Product list unavailable" message="Product records could not be loaded from the selected data source." detail={productQuery.error.message} isRetrying={productQuery.isFetching} onRetry={() => void productQuery.refetch()} /></div>;

  const result = productQuery.data;
  const tableActions: TableAction<ProductListItem>[] = [
    { label: 'Quick Detail', onClick: (product) => setDetailProductId(product.id) },
    { label: 'Edit Product', onClick: setEditProduct },
  ];

  return (
    <div className="products-page">
      <div className="products-page-heading"><div><p className="page-eyebrow">Product control plane</p><h1>Products</h1><p>Manage Digvation product definitions, their lifecycle, and the catalog available for client relationships.</p></div></div>
      <DDataTable columns={PRODUCT_COLUMNS} data={result.products} rowKey="id" searchable searchPlaceholder="Search product name, description, or code" searchValue={query.search} onSearchChange={(search) => updateQuery({ search })} filters={<DStatusFilter label="Status" allLabel="All statuses" options={PRODUCT_STATUS_OPTIONS} value={query.status} onChange={(status) => updateQuery({ status: status as ProductStatus | 'ALL' })} />} headerActions={<DButton onClick={() => setIsCreateDialogOpen(true)}>Add Product</DButton>} pagination={{ page: query.page, pageSize: query.limit, total: result.total }} onPageChange={(page) => updateQuery({ page })} onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })} emptyMessage={<DEmptyState title="No products found" description="Try another search or status filter, or add the first product." />} onRowClick={(product) => setDetailProductId(product.id)} actions={tableActions} />
      <ProductFormDialog open={isCreateDialogOpen} mode="create" onClose={() => setIsCreateDialogOpen(false)} />
      <ProductFormDialog open={editProduct !== null} mode="edit" product={editProduct ?? undefined} onClose={() => setEditProduct(null)} />
      {detailProductId ? <ProductDetailDialog productId={detailProductId} open onClose={() => setDetailProductId(null)} /> : null}
    </div>
  );
}

import { DDataTable, DEmptyState, DStatusFilter, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { catalogApi, type Product } from '../catalog-api';
import { catalogKeys, useProducts } from '../catalog-queries';
import { PRODUCT_FIELDS } from '../product-fields';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETIRED', label: 'Retired' },
];

const COLUMNS: TableColumn<Product>[] = [
  {
    key: 'name',
    label: 'Product',
    render: (product) => (
      <RecordButton>
        <Identity primary={product.name} secondary={product.description} />
      </RecordButton>
    ),
  },
  { key: 'code', label: 'Code', render: (product) => <Code>{product.code}</Code> },
  { key: 'kind', label: 'Kind', render: (product) => labelFor(product.kind) },
  { key: 'status', label: 'Status', render: (product) => <StatusBadge status={product.status} /> },
  { key: 'updated_at', label: 'Updated', render: (product) => formatInstant(product.updated_at) },
];

export function ProductListPage() {
  const navigate = useNavigate();
  const list = useListState();
  const products = useProducts(list.query);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const create = useApiMutation(catalogApi.createProduct, {
    success: 'Product registered',
    invalidate: [catalogKeys.all],
    toastErrors: false,
    onSuccess: (result) => navigate(`/products/${result.product_id}`),
  });

  return (
    <Page>
      <PageHeader
        title="Products"
        description="What Digvation sells. A product is the default billable unit; features and add-ons refine it."
        actions={
          can(PERMISSIONS.CATALOG_MANAGE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Register product
            </AppAction>
          ) : null
        }
      />
      <QueryState query={products} label="products">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search code or name"
            {...list.tableProps}
            filters={
              <DStatusFilter
                label="Status"
                allLabel="All statuses"
                options={STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(product) => navigate(`/products/${product.id}`)}
            emptyMessage={<DEmptyState title="No products found" description="Try another search, or register a product." />}
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        title="Register product"
        description="A new product starts as a draft and cannot be sold until it is active."
        fields={[
          {
            name: 'code',
            label: 'Code',
            required: true,
            maxLength: 64,
            half: true,
            placeholder: 'BUSINESS_SUITE',
            hint: 'Uppercase, cannot be changed later.',
          },
          ...PRODUCT_FIELDS,
        ]}
        initialValues={{ kind: 'RUNTIME_PRODUCT' }}
        submitLabel="Register product"
        onSubmit={(values) =>
          create.mutateAsync({
            code: read.text(values, 'code').toUpperCase(),
            name: read.text(values, 'name'),
            description: read.omit(values, 'description'),
            kind: read.text(values, 'kind') as Product['kind'],
          })
        }
        onClose={() => setCreating(false)}
      />
    </Page>
  );
}

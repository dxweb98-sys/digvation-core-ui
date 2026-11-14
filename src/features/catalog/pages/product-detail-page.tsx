import { DBadge, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { CATALOG_TRANSITIONS, catalogApi, type CatalogItem, type CatalogStatus, type ProductDetail } from '../catalog-api';
import { catalogKeys, useCatalogItems, useProduct } from '../catalog-queries';
import {
  AddOnsSection,
  CapabilitiesSection,
  FeaturesSection,
  PricesSection,
  ReleasesSection,
} from '../components/product-sections';
import { targetLabel } from '../components/transition';
import { PRODUCT_FIELDS } from '../product-fields';

const TRANSITION_MESSAGES: Record<CatalogStatus, string> = {
  ACTIVE: 'An active product can be chosen for new client services.',
  RETIRED: 'A retired product cannot get new services. CORE refuses while services are still open or it is installed somewhere.',
  DRAFT: 'The product goes back to draft and cannot be sold.',
};

function ItemBadges({ items }: { items: readonly CatalogItem[] }) {
  if (items.length === 0) return <span className="not-set">None</span>;
  return (
    <span className="app-page-actions">
      {items.map((item) => (
        <DBadge key={item.id} variant="outline">
          {item.name}
        </DBadge>
      ))}
    </span>
  );
}

function OverviewTab({ product }: { product: ProductDetail }) {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.CATALOG_MANAGE);
  const applications = useCatalogItems('applications', { status: 'ACTIVE', limit: 100, page: 1 }, canManage);
  const domains = useCatalogItems('base-domains', { status: 'ACTIVE', limit: 100, page: 1 }, canManage);
  const [editing, setEditing] = useState<'applications' | 'base-domains' | null>(null);
  const invalidate = [catalogKeys.product(product.id)];
  const save = useApiMutation(
    (input: { kind: 'applications' | 'base-domains'; ids: string[] }) =>
      input.kind === 'applications'
        ? catalogApi.setApplications(product.id, input.ids)
        : catalogApi.setBaseDomains(product.id, input.ids),
    { success: 'Composition saved', invalidate, toastErrors: false },
  );

  const current = editing === 'applications' ? product.applications : product.base_domains;
  const available = (editing === 'applications' ? applications.data?.items : domains.data?.items) ?? [];
  const options = [...new Map([...current, ...available].map((item) => [item.id, item])).values()].map((item) => ({
    value: item.id,
    label: item.name,
    description: item.code,
  }));

  return (
    <div className="app-page">
      <Section title="Details">
        <DetailList>
          <DetailItem label="Kind">{labelFor(product.kind)}</DetailItem>
          <DetailItem label="Status since">{formatInstant(product.status_changed_at)}</DetailItem>
          <DetailItem label="Description" wide>
            {product.description}
          </DetailItem>
        </DetailList>
      </Section>
      <Section
        title="Applications"
        actions={
          canManage ? (
            <AppAction tone="secondary" size="sm" onClick={() => setEditing('applications')}>
              Change
            </AppAction>
          ) : null
        }
      >
        <ItemBadges items={product.applications} />
      </Section>
      <Section
        title="Base domains"
        actions={
          canManage ? (
            <AppAction tone="secondary" size="sm" onClick={() => setEditing('base-domains')}>
              Change
            </AppAction>
          ) : null
        }
      >
        <ItemBadges items={product.base_domains} />
      </Section>
      <FormDialog
        open={editing !== null}
        title={editing === 'applications' ? 'Applications of the product' : 'Base domains of the product'}
        fields={[
          {
            name: 'ids',
            label: editing === 'applications' ? 'Applications' : 'Base domains',
            kind: 'checklist',
            options,
            hint: 'Only active items can be added.',
          },
        ]}
        initialValues={{ ids: current.map((item) => item.id) }}
        submitLabel="Save"
        onSubmit={(values) => save.mutateAsync({ kind: editing!, ids: read.list(values, 'ids') })}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

const TABS: { value: string; label: string; render: (product: ProductDetail) => ReactNode }[] = [
  { value: 'overview', label: 'Overview', render: (product) => <OverviewTab product={product} /> },
  { value: 'features', label: 'Features', render: (product) => <FeaturesSection product={product} /> },
  { value: 'capabilities', label: 'Capabilities', render: (product) => <CapabilitiesSection product={product} /> },
  { value: 'add-ons', label: 'Add-ons', render: (product) => <AddOnsSection product={product} /> },
  { value: 'prices', label: 'Prices', render: (product) => <PricesSection product={product} /> },
  { value: 'releases', label: 'Releases', render: (product) => <ReleasesSection product={product} /> },
];

function ProductView({ product }: { product: ProductDetail }) {
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<CatalogStatus | null>(null);
  const invalidate = [catalogKeys.all];
  const update = useApiMutation(
    (values: Parameters<typeof read.text>[0]) =>
      catalogApi.updateProduct(product.id, {
        name: read.text(values, 'name'),
        description: read.optional(values, 'description'),
        kind: read.text(values, 'kind') as ProductDetail['kind'],
      }),
    { success: 'Product saved', invalidate, toastErrors: false },
  );
  const transition = useApiMutation(
    (input: { target: CatalogStatus; reason: string }) =>
      catalogApi.transitionProduct(product.id, { target_status: input.target, reason: input.reason }),
    { success: 'Product status changed', invalidate, toastErrors: false },
  );
  const active = TABS.some((tab) => tab.value === params.get('tab')) ? params.get('tab')! : 'overview';

  return (
    <Page>
      <Link className="app-back-link" to="/products">
        ← Products
      </Link>
      <PageHeader
        title={product.name}
        meta={
          <>
            <Code>{product.code}</Code>
            <StatusBadge status={product.status} />
          </>
        }
        actions={
          <>
            {can(PERMISSIONS.CATALOG_LIFECYCLE_MANAGE)
              ? CATALOG_TRANSITIONS[product.status].map((status) => (
                  <AppAction
                    key={status}
                    tone={status === 'RETIRED' ? 'danger-subtle' : 'secondary'}
                    onClick={() => setTarget(status)}
                  >
                    {targetLabel(status)}
                  </AppAction>
                ))
              : null}
            {can(PERMISSIONS.CATALOG_MANAGE) ? <AppAction onClick={() => setEditing(true)}>Edit product</AppAction> : null}
          </>
        }
      />
      <DTabs value={active} defaultValue="overview" onValueChange={(tab) => setParams({ tab }, { replace: true })}>
        <DTabsList>
          {TABS.map((tab) => (
            <DTabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </DTabsTrigger>
          ))}
        </DTabsList>
        {TABS.map((tab) => (
          <DTabsContent key={tab.value} value={tab.value}>
            {active === tab.value ? tab.render(product) : null}
          </DTabsContent>
        ))}
      </DTabs>
      <FormDialog
        open={editing}
        title="Edit product"
        description="The product code cannot be changed."
        fields={PRODUCT_FIELDS}
        initialValues={{ kind: product.kind, name: product.name, description: product.description ?? '' }}
        submitLabel="Save product"
        onSubmit={(values) => update.mutateAsync(values)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${targetLabel(target ?? '')} ${product.name}`}
        message={target ? TRANSITION_MESSAGES[target] : ''}
        confirmLabel={targetLabel(target ?? '')}
        tone={target === 'RETIRED' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => transition.mutateAsync({ target: target!, reason: read.text(values, 'reason') })}
        onClose={() => setTarget(null)}
      />
    </Page>
  );
}

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const product = useProduct(productId);
  return <QueryState query={product} label="product">{(data) => <ProductView product={data} />}</QueryState>;
}

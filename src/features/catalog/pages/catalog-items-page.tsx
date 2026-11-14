import { DDataTable, DEmptyState, DStatusFilter, DTabs, DTabsList, DTabsTrigger, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { CATALOG_TRANSITIONS, catalogApi, type CatalogItem, type CatalogKind } from '../catalog-api';
import { catalogKeys, useCatalogItems } from '../catalog-queries';
import { useTransitions } from '../../../shared/forms/use-transitions';

const KINDS: { value: CatalogKind; label: string; singular: string; description: string }[] = [
  {
    value: 'capabilities',
    label: 'Capabilities',
    singular: 'capability',
    description: 'Reusable capabilities a product can include or offer as an add-on.',
  },
  {
    value: 'applications',
    label: 'Applications',
    singular: 'application',
    description: 'The apps a product is delivered as, such as the backoffice or the POS app.',
  },
  {
    value: 'base-domains',
    label: 'Base domains',
    singular: 'base domain',
    description: 'The business domains a product is built on.',
  },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETIRED', label: 'Retired' },
];

const COLUMNS: TableColumn<CatalogItem>[] = [
  { key: 'name', label: 'Name', render: (item) => <Identity primary={item.name} secondary={item.description} /> },
  { key: 'code', label: 'Code', render: (item) => <Code>{item.code}</Code> },
  { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
  { key: 'updated_at', label: 'Updated', render: (item) => formatInstant(item.updated_at) },
];

const NAME_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Name', required: true, maxLength: 150 },
  { name: 'description', label: 'Description', kind: 'textarea', maxLength: 500 },
];

function CatalogKindView({ kind }: { kind: (typeof KINDS)[number] }) {
  const list = useListState();
  const items = useCatalogItems(kind.value, list.query);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const invalidate = [catalogKeys.all];
  const create = useApiMutation(
    (values: Parameters<typeof read.text>[0]) =>
      catalogApi.createItem(kind.value, {
        code: read.text(values, 'code').toUpperCase(),
        name: read.text(values, 'name'),
        description: read.optional(values, 'description'),
      }),
    { success: `${kind.singular[0].toUpperCase()}${kind.singular.slice(1)} added`, invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { id: string; values: Parameters<typeof read.text>[0] }) =>
      catalogApi.updateItem(kind.value, input.id, {
        name: read.text(input.values, 'name'),
        description: read.optional(input.values, 'description'),
      }),
    { success: 'Saved', invalidate, toastErrors: false },
  );
  const transition = useApiMutation((run: () => Promise<unknown>) => run(), {
    success: 'Status changed',
    invalidate,
    toastErrors: false,
  });
  const transitions = useTransitions<CatalogItem>({
    transitions: CATALOG_TRANSITIONS,
    name: (item) => item.name,
    apply: (item, target, reason) =>
      transition.mutateAsync(() =>
        catalogApi.transitionItem(kind.value, item.id, { target_status: target as CatalogItem['status'], reason }),
      ),
  });

  const actions = [
    ...(can(PERMISSIONS.CATALOG_MANAGE) ? [{ label: 'Edit', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.CATALOG_LIFECYCLE_MANAGE) ? transitions.actions : []),
  ];

  return (
    <>
      <PageHeader
        title={kind.label}
        description={kind.description}
        actions={
          can(PERMISSIONS.CATALOG_MANAGE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Add {kind.singular}
            </AppAction>
          ) : null
        }
      />
      <QueryState query={items} label={kind.label.toLowerCase()}>
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
            actions={actions.length ? actions : undefined}
            emptyMessage={<DEmptyState title={`No ${kind.label.toLowerCase()}`} description="Add one to use it in products." />}
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        title={`Add ${kind.singular}`}
        description="It starts as a draft."
        fields={[
          { name: 'code', label: 'Code', required: true, maxLength: 64, hint: 'Uppercase, unique, cannot be changed.' },
          ...NAME_FIELDS,
        ]}
        submitLabel={`Add ${kind.singular}`}
        onSubmit={(values) => create.mutateAsync(values)}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title={`Edit ${kind.singular}`}
        description={editing ? <Code>{editing.code}</Code> : undefined}
        fields={NAME_FIELDS}
        initialValues={{ name: editing?.name ?? '', description: editing?.description ?? '' }}
        submitLabel="Save"
        onSubmit={(values) => update.mutateAsync({ id: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      {transitions.dialog}
    </>
  );
}

export function CatalogItemsPage() {
  const [params, setParams] = useSearchParams();
  const kind = KINDS.find((item) => item.value === params.get('kind')) ?? KINDS[0];
  return (
    <Page>
      <DTabs value={kind.value} defaultValue="capabilities" onValueChange={(value) => setParams({ kind: value }, { replace: true })}>
        <DTabsList>
          {KINDS.map((item) => (
            <DTabsTrigger key={item.value} value={item.value}>
              {item.label}
            </DTabsTrigger>
          ))}
        </DTabsList>
      </DTabs>
      <CatalogKindView key={kind.value} kind={kind} />
    </Page>
  );
}

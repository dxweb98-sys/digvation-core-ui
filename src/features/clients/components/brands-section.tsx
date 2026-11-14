import { DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { BRAND_CREATE_FIELDS, BRAND_EDIT_FIELDS, brandBody, brandFormValues } from '../client-forms';
import { clientsApi, type BrandWithBilling, type ClientDetail } from '../clients-api';
import { clientKeys, useBrands } from '../clients-queries';

const COLUMNS: TableColumn<BrandWithBilling>[] = [
  { key: 'name', label: 'Brand', render: (brand) => <Identity primary={brand.name} secondary={brand.description} /> },
  { key: 'code', label: 'Code', render: (brand) => <Code>{brand.code}</Code> },
  { key: 'status', label: 'Status', render: (brand) => <StatusBadge status={brand.status} /> },
  {
    key: 'billing_contacts',
    label: 'Invoices go to',
    render: (brand) =>
      brand.billing_contact_source === 'NONE' ? (
        <span className="not-set">No billing contact</span>
      ) : (
        <Identity
          primary={brand.billing_contacts.map((contact) => contact.email ?? contact.name).join(', ')}
          secondary={brand.billing_contact_source === 'CLIENT' ? 'Client billing contact' : 'Brand billing contact'}
        />
      ),
  },
];

export function BrandsSection({ client }: { client: ClientDetail }) {
  const brands = useBrands(client.id);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BrandWithBilling | null>(null);
  const [transition, setTransition] = useState<BrandWithBilling | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const archived = client.status === 'ARCHIVED';

  const create = useApiMutation(
    (body: Parameters<typeof clientsApi.createBrand>[1]) => clientsApi.createBrand(client.id, body),
    { success: 'Brand added', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { brandId: string; body: Parameters<typeof clientsApi.updateBrand>[2] }) =>
      clientsApi.updateBrand(client.id, input.brandId, input.body),
    { success: 'Brand saved', invalidate, toastErrors: false },
  );
  const changeStatus = useApiMutation(
    (input: { brand: BrandWithBilling; reason: string }) =>
      clientsApi.transitionBrand(client.id, input.brand.id, {
        target_status: input.brand.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
        reason: input.reason,
      }),
    {
      success: (_, input) => (input.brand.status === 'ACTIVE' ? 'Brand archived' : 'Brand reactivated'),
      invalidate,
      toastErrors: false,
    },
  );

  const actions: TableAction<BrandWithBilling>[] = [
    ...(can(PERMISSIONS.CLIENTS_MANAGE) && !archived ? [{ label: 'Edit', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE) && !archived
      ? [
          { label: 'Archive', variant: 'danger' as const, show: (brand: BrandWithBilling) => brand.status === 'ACTIVE', onClick: setTransition },
          { label: 'Reactivate', show: (brand: BrandWithBilling) => brand.status === 'ARCHIVED', onClick: setTransition },
        ]
      : []),
  ];

  return (
    <Section
      title="Brands"
      actions={
        can(PERMISSIONS.CLIENTS_MANAGE) && !archived ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
            Add brand
          </AppAction>
        ) : null
      }
    >
      <QueryState query={brands} label="brands">
        {(items) => (
          <DDataTable
            columns={COLUMNS}
            data={items}
            rowKey="id"
            actions={actions.length ? actions : undefined}
            emptyMessage={<DEmptyState title="No brands" description="Add a brand to sell services under it." />}
          />
        )}
      </QueryState>

      <FormDialog
        open={creating}
        title="Add brand"
        fields={BRAND_CREATE_FIELDS}
        submitLabel="Add brand"
        onSubmit={(values) => create.mutateAsync({ ...brandBody(values), code: read.text(values, 'code').toUpperCase() })}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit brand"
        description={editing ? <Code>{editing.code}</Code> : undefined}
        fields={BRAND_EDIT_FIELDS}
        initialValues={editing ? brandFormValues(editing) : undefined}
        submitLabel="Save brand"
        onSubmit={(values) => update.mutateAsync({ brandId: editing!.id, body: brandBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={transition !== null}
        title={transition?.status === 'ACTIVE' ? `Archive ${transition.name}` : `Reactivate ${transition?.name ?? ''}`}
        message={
          transition?.status === 'ACTIVE'
            ? 'An archived brand cannot get new services. CORE refuses while it still has open services or unpaid invoices, or when it is the last active brand.'
            : `The brand becomes ${labelFor('ACTIVE').toLowerCase()} again.`
        }
        confirmLabel={transition?.status === 'ACTIVE' ? 'Archive' : 'Reactivate'}
        tone={transition?.status === 'ACTIVE' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => changeStatus.mutateAsync({ brand: transition!, reason: read.text(values, 'reason') })}
        onClose={() => setTransition(null)}
      />
    </Section>
  );
}

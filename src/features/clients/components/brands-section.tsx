import { DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { brandBody, brandCreateFields, brandEditFields, brandFormValues } from '../client-forms';
import { clientsApi, type BrandWithBilling, type ClientDetail } from '../clients-api';
import { clientKeys, useBrands } from '../clients-queries';

/** The table columns; `groupName` turns the stored group id into its name. */
function columns(groupName: Map<string, string>, clientId: string): TableColumn<BrandWithBilling>[] { return [
    { key: 'name',
      label: 'Brand',
      render: (brand) => (
        <Link to={`/clients/${clientId}/brands/${brand.id}`}>
          <Identity primary={brand.name} secondary={brand.description} />
        </Link>
      ) },
    { key: 'group_id',
      label: 'Group',
      render: (brand) =>
        brand.group_id ? (
          <Link to={`/clients/${clientId}?tab=groups`}>{groupName.get(brand.group_id) ?? 'Group'}</Link>
        ) : (
          <span className="not-set">Tanpa group</span>
        ) },
    { key: 'code', label: 'Code', render: (brand) => <Code>{brand.code}</Code> },
    { key: 'status', label: 'Status', render: (brand) => <StatusBadge status={brand.status} /> },
    { key: 'billing_contacts',
      label: 'Invoice dikirim ke',
      render: (brand) =>
        brand.billing_contact_source === 'NONE' ? (
          <span className="not-set">Belum ada kontak penagihan</span>
        ) : (
          <Identity
            primary={brand.billing_contacts.map((contact) => contact.email ?? contact.name).join(', ')}
            secondary={ brand.billing_contact_source === 'CLIENT'
                ? 'Kontak penagihan client'
                : brand.billing_contact_source === 'GROUP'
                  ? 'Kontak penagihan group'
                  : 'Kontak penagihan brand'
            }
          />
        ) },
  ];
}

export function BrandsSection({ client }: { client: ClientDetail }) { const brands = useBrands(client.id);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BrandWithBilling | null>(null);
  const [transition, setTransition] = useState<BrandWithBilling | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const archived = client.status === 'ARCHIVED';
  const tableColumns = useMemo(
    () => columns(new Map(client.groups.map((group) => [group.id, group.name])), client.id),
    [client.groups, client.id],
  );
  const createFields = useMemo(() => brandCreateFields(client.legal_entities), [client.legal_entities]);
  const editFields = useMemo(() => brandEditFields(client.legal_entities), [client.legal_entities]);

  const create = useApiMutation(
    (body: Parameters<typeof clientsApi.createBrand>[1]) => clientsApi.createBrand(client.id, body),
    { success: 'Brand ditambahkan', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { brandId: string; body: Parameters<typeof clientsApi.updateBrand>[2] }) =>
      clientsApi.updateBrand(client.id, input.brandId, input.body),
    { success: 'Brand tersimpan', invalidate, toastErrors: false },
  );
  const changeStatus = useApiMutation(
    (input: { brand: BrandWithBilling; reason: string }) =>
      clientsApi.transitionBrand(client.id, input.brand.id, { target_status: input.brand.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
        reason: input.reason }),
    { success: (_, input) => (input.brand.status === 'ACTIVE' ? 'Brand diarsipkan' : 'Brand diaktifkan kembali'),
      invalidate,
      toastErrors: false },
  );

  const actions: TableAction<BrandWithBilling>[] = [
    ...(can(PERMISSIONS.CLIENTS_MANAGE) && !archived ? [{ label: 'Edit', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE) && !archived
      ? [
          { label: 'Arsipkan', variant: 'danger' as const, show: (brand: BrandWithBilling) => brand.status === 'ACTIVE', onClick: setTransition },
          { label: 'Aktifkan kembali', show: (brand: BrandWithBilling) => brand.status === 'ARCHIVED', onClick: setTransition },
        ]
      : []),
  ];

  return (
    <>
      <Section
        title="Brand client"
        actions={ can(PERMISSIONS.CLIENTS_MANAGE) && !archived ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
              Tambah brand
            </AppAction>
          ) : null
        }
      >
        <QueryState query={brands} label="brands">
          {(items) => (
            <DDataTable
              columns={tableColumns}
              data={items}
              rowKey="id"
              actions={actions.length ? actions : undefined}
              emptyMessage="Belum ada brand. Tambahkan brand supaya service bisa dijual di bawah client ini."
            />
          )}
        </QueryState>
      </Section>

      <FormDialog
        open={creating}
        title="Tambah brand"
        fields={createFields}
        submitLabel="Tambah brand"
        onSubmit={(values) => create.mutateAsync({ ...brandBody(values), code: read.text(values, 'code').toUpperCase() })}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit brand"
        description={editing ? <Code>{editing.code}</Code> : undefined}
        fields={editFields}
        initialValues={editing ? brandFormValues(editing) : undefined}
        submitLabel="Simpan brand"
        onSubmit={(values) => update.mutateAsync({ brandId: editing!.id, body: brandBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={transition !== null}
        title={ transition?.status === 'ACTIVE' ? `Arsipkan ${transition.name}` : `Aktifkan kembali ${transition?.name ?? ''}`
        }
        message={ transition?.status === 'ACTIVE'
            ? 'Brand yang diarsipkan tidak bisa mendapat service baru. CORE menolaknya selama brand masih punya service yang belum ditutup atau invoice belum lunas, atau saat ia brand aktif terakhir client ini.'
            : 'Brand kembali aktif.'
        }
        confirmLabel={transition?.status === 'ACTIVE' ? 'Arsipkan' : 'Aktifkan kembali'}
        tone={transition?.status === 'ACTIVE' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => changeStatus.mutateAsync({ brand: transition!, reason: read.text(values, 'reason') })}
        onClose={() => setTransition(null)}
      />
    </>
  );
}

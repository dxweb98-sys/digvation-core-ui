import { DBadge, DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec, type FormValues } from '../../../shared/forms/form-spec';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { useClientOptions } from '../../clients/clients-queries';
import { CATALOG_TRANSITIONS,
  RELEASE_TRANSITIONS,
  catalogApi,
  type AddOn,
  type Feature,
  type ProductCapability,
  type ProductDetail,
  type Release } from '../catalog-api';
import { catalogKeys,
  useAddOns,
  useCatalogItems,
  useFeatures,
  usePrices,
  useProductCapabilities,
  useReleases } from '../catalog-queries';
import { PricesTable } from './prices-table';
import { useTransitions } from '../../../shared/forms/use-transitions';

const NAME_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Nama', required: true, maxLength: 150 },
  { name: 'description', label: 'Deskripsi', kind: 'textarea', maxLength: 500 },
];

function scopedCreateFields(clientOptions: { value: string; label: string }[], codePlaceholder: string): FieldSpec[] { return [
    { name: 'code', label: 'Code', required: true, maxLength: 64, half: true, placeholder: codePlaceholder, hint: 'Huruf kapital, unik di product ini, tidak bisa diubah.' },
    { name: 'scope',
      label: 'Berlaku untuk',
      kind: 'select',
      required: true,
      half: true,
      options: [
        { value: 'PRODUCT', label: 'Semua client product ini' },
        { value: 'CLIENT', label: 'Satu client saja (kustom)' },
      ] },
    { name: 'owner_client_id',
      label: 'Client',
      kind: 'select',
      required: true,
      options: clientOptions,
      visible: (values) => values.scope === 'CLIENT' },
    ...NAME_FIELDS,
  ];
}

function scopedBody(values: FormValues) { const scope = read.text(values, 'scope') as 'PRODUCT' | 'CLIENT';
  return { code: read.text(values, 'code').toUpperCase(),
    name: read.text(values, 'name'),
    description: read.optional(values, 'description'),
    scope,
    owner_client_id: scope === 'CLIENT' ? read.text(values, 'owner_client_id') : undefined };
}

function nameBody(values: FormValues) { return { name: read.text(values, 'name'), description: read.optional(values, 'description') };
}

const scopeLabel = (scope: string) => (scope === 'CLIENT' ? 'Kustom (satu client)' : 'Product');

export function FeaturesSection({ product }: { product: ProductDetail }) { const { can } = usePermissions();
  const features = useFeatures(product.id);
  const clients = useClientOptions(can(PERMISSIONS.CLIENTS_READ));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const invalidate = [catalogKeys.productPart(product.id, 'features'), catalogKeys.productPart(product.id, 'add-ons')];
  const create = useApiMutation((values: FormValues) => catalogApi.createFeature(product.id, scopedBody(values)), { success: 'Feature ditambahkan',
    invalidate,
    toastErrors: false });
  const update = useApiMutation(
    (input: { id: string; values: FormValues }) => catalogApi.updateFeature(product.id, input.id, nameBody(input.values)),
    { success: 'Feature disimpan', invalidate, toastErrors: false },
  );
  const transition = useApiMutation((run: () => Promise<unknown>) => run(), { success: 'Status feature diubah',
    invalidate,
    toastErrors: false });
  const transitions = useTransitions<Feature>({ transitions: CATALOG_TRANSITIONS,
    name: (feature) => feature.name,
    describe: (_, target) =>
      target === 'RETIRED'
        ? 'Feature yang dipensiunkan tidak bisa lagi dipilih untuk service. CORE menolak selama masih ada service yang memakainya.'
        : target === 'ACTIVE'
          ? 'Feature bisa dipilih untuk service client.'
          : 'Feature kembali menjadi draf.',
    apply: (feature, target, reason) =>
      transition.mutateAsync(() =>
        catalogApi.transitionFeature(product.id, feature.id, { target_status: target as Feature['status'], reason }),
      ) });

  const columns: TableColumn<Feature>[] = [
    { key: 'name', label: 'Feature', render: (feature) => <Identity primary={feature.name} secondary={feature.description} /> },
    { key: 'code', label: 'Code', render: (feature) => <Code>{feature.code}</Code> },
    { key: 'scope', label: 'Berlaku untuk', render: (feature) => scopeLabel(feature.scope) },
    { key: 'status', label: 'Status', render: (feature) => <StatusBadge status={feature.status} /> },
  ];
  const actions: TableAction<Feature>[] = [
    ...(can(PERMISSIONS.CATALOG_MANAGE) ? [{ label: 'Edit', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.CATALOG_LIFECYCLE_MANAGE) ? transitions.actions : []),
  ];
  const createFields = useMemo(() => scopedCreateFields(clients.data ?? [], 'PRODUCT_COMMISSION'), [clients.data]);

  return (
    <Section
      title="Features"
      actions={ can(PERMISSIONS.CATALOG_MANAGE) ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
            Tambah feature
          </AppAction>
        ) : null
      }
    >
      <QueryState query={features} label="features">
        {(items) => (
          <DDataTable
            columns={columns}
            data={items}
            rowKey="id"
            actions={actions.length ? actions : undefined}
            emptyMessage="Belum ada feature. Feature adalah hal yang bisa diaktifkan pada service client."
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        title="Tambah feature"
        description="Feature baru dimulai sebagai draf."
        fields={createFields}
        initialValues={{ scope: 'PRODUCT' }}
        submitLabel="Tambah feature"
        onSubmit={(values) => create.mutateAsync(values)}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit feature"
        description={editing ? <Code>{editing.code}</Code> : undefined}
        fields={NAME_FIELDS}
        initialValues={{ name: editing?.name ?? '', description: editing?.description ?? '' }}
        submitLabel="Simpan feature"
        onSubmit={(values) => update.mutateAsync({ id: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      {transitions.dialog}
    </Section>
  );
}

export function CapabilitiesSection({ product }: { product: ProductDetail }) { const { can } = usePermissions();
  const links = useProductCapabilities(product.id);
  const canManage = can(PERMISSIONS.CATALOG_MANAGE);
  const catalog = useCatalogItems('capabilities', { status: 'ACTIVE', limit: 100, page: 1 }, canManage);
  const [linking, setLinking] = useState(false);
  const [retiring, setRetiring] = useState<ProductCapability | null>(null);
  const invalidate = [catalogKeys.productPart(product.id, 'capabilities'), catalogKeys.productPart(product.id, 'add-ons')];
  const link = useApiMutation(
    (values: FormValues) =>
      catalogApi.linkCapability(product.id, { capability_id: read.text(values, 'capability_id'),
        inclusion: read.text(values, 'inclusion') as 'INCLUDED' | 'COMPATIBLE' }),
    { success: 'Capability ditautkan', invalidate, toastErrors: false },
  );
  const retire = useApiMutation(
    (input: { link: ProductCapability; reason: string }) => catalogApi.retireCapability(product.id, input.link.id, input.reason),
    { success: 'Tautan capability dipensiunkan', invalidate, toastErrors: false },
  );

  const linked = new Set((links.data ?? []).filter((item) => item.status === 'ACTIVE').map((item) => item.capability.id));
  const options = (catalog.data?.items ?? [])
    .filter((item) => !linked.has(item.id))
    .map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }));

  const columns: TableColumn<ProductCapability>[] = [
    { key: 'capability',
      label: 'Capability',
      render: (item) => <Identity primary={item.capability.name} secondary={item.capability.description} /> },
    { key: 'code', label: 'Code', render: (item) => <Code>{item.capability.code}</Code> },
    { key: 'inclusion',
      label: 'Terhadap product',
      render: (item) => (item.inclusion === 'INCLUDED' ? 'Termasuk' : 'Kompatibel (dijual sebagai add-on)') },
    { key: 'status', label: 'Tautan', render: (item) => <StatusBadge status={item.status} /> },
  ];

  return (
    <Section
      title="Capabilities"
      actions={ canManage ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setLinking(true)}>
            Tautkan capability
          </AppAction>
        ) : null
      }
    >
      <QueryState query={links} label="capabilities">
        {(items) => (
          <DDataTable
            columns={columns}
            data={items}
            rowKey="id"
            actions={ can(PERMISSIONS.CATALOG_LIFECYCLE_MANAGE)
                ? [{ label: 'Pensiunkan tautan', variant: 'danger', show: (item) => item.status === 'ACTIVE', onClick: setRetiring }]
                : undefined
            }
            emptyMessage="Belum ada capability tertaut. Menautkan capability berarti capability itu cocok dengan product ini. Ini tidak memberikannya ke client mana pun."
          />
        )}
      </QueryState>
      <FormDialog
        open={linking}
        title="Tautkan capability"
        description="Capability yang termasuk datang bersama setiap service product; yang kompatibel dijual lewat add-on."
        fields={[
          { name: 'capability_id', label: 'Capability', kind: 'select', required: true, options, hint: 'Hanya capability aktif yang bisa ditautkan.' },
          { name: 'inclusion',
            label: 'Terhadap product',
            kind: 'select',
            required: true,
            options: [
              { value: 'INCLUDED', label: 'Termasuk' },
              { value: 'COMPATIBLE', label: 'Kompatibel (dijual sebagai add-on)' },
            ] },
        ]}
        submitLabel="Tautkan capability"
        onSubmit={(values) => link.mutateAsync(values)}
        onClose={() => setLinking(false)}
      />
      <ConfirmDialog
        open={retiring !== null}
        title="Pensiunkan tautan capability"
        message={`${retiring?.capability.name ?? ''} tidak lagi menjadi bagian product ini. Tautan disimpan sebagai riwayat.`}
        confirmLabel="Pensiunkan tautan"
        reason={{}}
        onConfirm={(values) => retire.mutateAsync({ link: retiring!, reason: read.text(values, 'reason') })}
        onClose={() => setRetiring(null)}
      />
    </Section>
  );
}

export function AddOnsSection({ product }: { product: ProductDetail }) { const { can } = usePermissions();
  const addOns = useAddOns(product.id);
  const features = useFeatures(product.id);
  const capabilities = useProductCapabilities(product.id);
  const clients = useClientOptions(can(PERMISSIONS.CLIENTS_READ));
  const canManage = can(PERMISSIONS.CATALOG_MANAGE);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AddOn | null>(null);
  const [granting, setGranting] = useState<AddOn | null>(null);
  const [pricing, setPricing] = useState<AddOn | null>(null);
  const invalidate = [catalogKeys.productPart(product.id, 'add-ons')];

  const create = useApiMutation((values: FormValues) => catalogApi.createAddOn(product.id, scopedBody(values)), { success: 'Add-on ditambahkan',
    invalidate,
    toastErrors: false });
  const update = useApiMutation(
    (input: { id: string; values: FormValues }) => catalogApi.updateAddOn(product.id, input.id, nameBody(input.values)),
    { success: 'Add-on disimpan', invalidate, toastErrors: false },
  );
  const grants = useApiMutation(
    (input: { id: string; values: FormValues }) =>
      catalogApi.setAddOnGrants(product.id, input.id, { feature_ids: read.list(input.values, 'feature_ids'),
        capability_ids: read.list(input.values, 'capability_ids') }),
    { success: 'Isi add-on disimpan', invalidate, toastErrors: false },
  );
  const setPrice = useApiMutation(
    (input: { id: string; body: Parameters<typeof catalogApi.setAddOnPrice>[2] }) =>
      catalogApi.setAddOnPrice(product.id, input.id, input.body),
    { success: 'Harga disimpan', invalidate, toastErrors: false },
  );
  const deletePrice = useApiMutation(
    (input: { id: string; priceId: string }) => catalogApi.deleteAddOnPrice(product.id, input.id, input.priceId),
    { success: 'Harga dihapus', invalidate, toastErrors: false },
  );
  const transition = useApiMutation((run: () => Promise<unknown>) => run(), { success: 'Status add-on diubah',
    invalidate,
    toastErrors: false });
  const transitions = useTransitions<AddOn>({ transitions: CATALOG_TRANSITIONS,
    name: (addOn) => addOn.name,
    describe: (_, target) =>
      target === 'ACTIVE'
        ? 'Add-on bisa dijual. Setidaknya harus memberi satu feature atau capability.'
        : target === 'RETIRED'
          ? 'Add-on yang dipensiunkan tidak bisa dijual lagi. CORE menolak selama masih ada service atau contract yang memakainya.'
          : 'Add-on kembali menjadi draf.',
    apply: (addOn, target, reason) =>
      transition.mutateAsync(() =>
        catalogApi.transitionAddOn(product.id, addOn.id, { target_status: target as AddOn['status'], reason }),
      ) });

  const featureByCode = new Map((features.data ?? []).map((feature) => [feature.code, feature.id]));
  const capabilityByCode = new Map((capabilities.data ?? []).map((link) => [link.capability.code, link.capability.id]));
  const columns: TableColumn<AddOn>[] = [
    { key: 'name', label: 'Add-on', render: (addOn) => <Identity primary={addOn.name} secondary={addOn.description} /> },
    { key: 'code', label: 'Code', render: (addOn) => <Code>{addOn.code}</Code> },
    { key: 'features',
      label: 'Isi',
      render: (addOn) =>
        addOn.features.length + addOn.capabilities.length === 0 ? (
          <span className="not-set">Belum ada</span>
        ) : (
          <span className="app-page-actions">
            {[...addOn.features, ...addOn.capabilities].map((code) => (
              <DBadge key={code} variant="outline">
                {code}
              </DBadge>
            ))}
          </span>
        ) },
    { key: 'prices',
      label: 'Harga list',
      render: (addOn) =>
        addOn.prices.length === 0
          ? '—'
          : addOn.prices.map((price) => `${formatMoney(price.amount, price.currency)} / ${labelFor(price.billing_cycle).toLowerCase()}`).join(', ') },
    { key: 'scope', label: 'Berlaku untuk', render: (addOn) => scopeLabel(addOn.scope) },
    { key: 'status', label: 'Status', render: (addOn) => <StatusBadge status={addOn.status} /> },
  ];
  const actions: TableAction<AddOn>[] = [
    ...(canManage
      ? [
          { label: 'Edit', onClick: setEditing },
          { label: 'Isi', onClick: setGranting },
          { label: 'Harga', onClick: setPricing },
        ]
      : []),
    ...(can(PERMISSIONS.CATALOG_LIFECYCLE_MANAGE) ? transitions.actions : []),
  ];
  const createFields = useMemo(() => scopedCreateFields(clients.data ?? [], 'EXTRA_OUTLET'), [clients.data]);
  const pricingAddOn = (addOns.data ?? []).find((addOn) => addOn.id === pricing?.id) ?? pricing;

  return (
    <Section
      title="Add-ons"
      actions={ canManage ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
            Tambah add-on
          </AppAction>
        ) : null
      }
    >
      <QueryState query={addOns} label="add-ons">
        {(items) => (
          <DDataTable
            columns={columns}
            data={items}
            rowKey="id"
            actions={actions.length ? actions : undefined}
            emptyMessage="Belum ada add-on. Add-on menjual feature atau capability tambahan di atas product."
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        title="Tambah add-on"
        description="Add-on baru dimulai sebagai draf. Pilih isinya sebelum mengaktifkannya."
        fields={createFields}
        initialValues={{ scope: 'PRODUCT' }}
        submitLabel="Tambah add-on"
        onSubmit={(values) => create.mutateAsync(values)}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit add-on"
        description={editing ? <Code>{editing.code}</Code> : undefined}
        fields={NAME_FIELDS}
        initialValues={{ name: editing?.name ?? '', description: editing?.description ?? '' }}
        submitLabel="Simpan add-on"
        onSubmit={(values) => update.mutateAsync({ id: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      <FormDialog
        open={granting !== null}
        kind="wide"
        title={`Isi ${granting?.name ?? ''}`}
        fields={[
          { name: 'feature_ids',
            label: 'Features',
            kind: 'checklist',
            options: (features.data ?? [])
              .filter((feature) => feature.status !== 'RETIRED')
              .map((feature) => ({ value: feature.id, label: feature.name, description: feature.code })) },
          { name: 'capability_ids',
            label: 'Capabilities',
            kind: 'checklist',
            options: (capabilities.data ?? [])
              .filter((link) => link.status === 'ACTIVE')
              .map((link) => ({ value: link.capability.id, label: link.capability.name, description: link.capability.code })),
            hint: 'Hanya capability yang tertaut ke product ini yang bisa diberikan.' },
        ]}
        initialValues={{ feature_ids: (granting?.features ?? []).map((code) => featureByCode.get(code)).filter((id): id is string => Boolean(id)),
          capability_ids: (granting?.capabilities ?? []).map((code) => capabilityByCode.get(code)).filter((id): id is string => Boolean(id)) }}
        submitLabel="Simpan isi"
        onSubmit={(values) => grants.mutateAsync({ id: granting!.id, values })}
        onClose={() => setGranting(null)}
      />
      {pricingAddOn ? (
        <FormDialog
          open
          kind="wide"
          title={`Harga ${pricingAddOn.name}`}
          fields={[]}
          submitLabel="Selesai"
          onSubmit={async () => undefined}
          onClose={() => setPricing(null)}
        >
          <PricesTable
            prices={pricingAddOn.prices}
            canManage={canManage}
            onSet={(body) => setPrice.mutateAsync({ id: pricingAddOn.id, body })}
            onDelete={(price) => deletePrice.mutateAsync({ id: pricingAddOn.id, priceId: price.id })}
          />
        </FormDialog>
      ) : null}
      {transitions.dialog}
    </Section>
  );
}

export function PricesSection({ product }: { product: ProductDetail }) { const { can } = usePermissions();
  const prices = usePrices(product.id);
  const invalidate = [catalogKeys.productPart(product.id, 'prices')];
  const setPrice = useApiMutation((body: Parameters<typeof catalogApi.setPrice>[1]) => catalogApi.setPrice(product.id, body), { success: 'Harga disimpan',
    invalidate,
    toastErrors: false });
  const deletePrice = useApiMutation((priceId: string) => catalogApi.deletePrice(product.id, priceId), { success: 'Harga dihapus',
    invalidate,
    toastErrors: false });
  return (
    <Section title="Harga list">
      <QueryState query={prices} label="harga">
        {(items) => (
          <PricesTable
            prices={items}
            canManage={can(PERMISSIONS.CATALOG_MANAGE)}
            onSet={(body) => setPrice.mutateAsync(body)}
            onDelete={(price) => deletePrice.mutateAsync(price.id)}
          />
        )}
      </QueryState>
    </Section>
  );
}

const RELEASE_FIELDS: FieldSpec[] = [
  { name: 'artifact_ref', label: 'Artifact', maxLength: 300, placeholder: 'sha256:… atau revisi build', hint: 'Wajib diisi sebelum release bisa dirilis.' },
  { name: 'notes', label: 'Catatan', kind: 'textarea', maxLength: 2000 },
];

export function ReleasesSection({ product }: { product: ProductDetail }) { const { can } = usePermissions();
  const releases = useReleases(product.id);
  const canManage = can(PERMISSIONS.RELEASES_MANAGE);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const invalidate = [catalogKeys.productPart(product.id, 'releases')];
  const create = useApiMutation(
    (values: FormValues) =>
      catalogApi.createRelease(product.id, { version: read.text(values, 'version'),
        artifact_ref: read.optional(values, 'artifact_ref'),
        notes: read.optional(values, 'notes') }),
    { success: 'Release didaftarkan', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { id: string; values: FormValues }) =>
      catalogApi.updateRelease(product.id, input.id, { artifact_ref: read.optional(input.values, 'artifact_ref'),
        notes: read.optional(input.values, 'notes') }),
    { success: 'Release disimpan', invalidate, toastErrors: false },
  );
  const transition = useApiMutation((run: () => Promise<unknown>) => run(), { success: 'Status release diubah',
    invalidate,
    toastErrors: false });
  const transitions = useTransitions<Release>({ transitions: RELEASE_TRANSITIONS,
    name: (release) => `versi ${release.version}`,
    describe: (_, target) =>
      target === 'RELEASED'
        ? 'Versi ini tersedia sebagai target installation. Perlu artifact.'
        : 'Versi yang ditarik tidak bisa dijadikan target lagi. CORE menolak selama masih ada installation yang menargetkannya.',
    apply: (release, target, reason) =>
      transition.mutateAsync(() =>
        catalogApi.transitionRelease(product.id, release.id, { target_status: target as Release['status'], reason }),
      ) });

  const columns: TableColumn<Release>[] = [
    { key: 'version', label: 'Versi', render: (release) => <Code>{release.version}</Code> },
    { key: 'artifact_ref', label: 'Artifact', render: (release) => (release.artifact_ref ? <Code>{release.artifact_ref}</Code> : '—') },
    { key: 'status', label: 'Status', render: (release) => <StatusBadge status={release.status} /> },
    { key: 'released_at', label: 'Dirilis', render: (release) => formatInstant(release.released_at) },
    { key: 'notes', label: 'Catatan', render: (release) => release.notes ?? '—' },
  ];

  return (
    <Section
      title="Releases"
      actions={ canManage ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
            Daftarkan release
          </AppAction>
        ) : null
      }
    >
      <QueryState query={releases} label="releases">
        {(items) => (
          <DDataTable
            columns={columns}
            data={items}
            rowKey="id"
            actions={ canManage
                ? [{ label: 'Edit', show: (release: Release) => release.status === 'DRAFT', onClick: setEditing }, ...transitions.actions]
                : undefined
            }
            emptyMessage="Belum ada release. Daftarkan versi setelah build-nya tersedia."
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        title="Daftarkan release"
        description="Release baru dimulai sebagai draf. Versi tidak bisa diubah setelahnya."
        fields={[
          { name: 'version',
            label: 'Versi',
            required: true,
            placeholder: '1.10.0',
            validate: (value) =>
              typeof value === 'string' && value.trim() && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.trim())
                ? 'Gunakan versi semantik seperti 1.10.0.'
                : undefined },
          ...RELEASE_FIELDS,
        ]}
        submitLabel="Daftarkan release"
        onSubmit={(values) => create.mutateAsync(values)}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title={`Edit versi ${editing?.version ?? ''}`}
        fields={RELEASE_FIELDS}
        initialValues={{ artifact_ref: editing?.artifact_ref ?? '', notes: editing?.notes ?? '' }}
        submitLabel="Simpan release"
        onSubmit={(values) => update.mutateAsync({ id: editing!.id, values })}
        onClose={() => setEditing(null)}
      />
      {transitions.dialog}
    </Section>
  );
}

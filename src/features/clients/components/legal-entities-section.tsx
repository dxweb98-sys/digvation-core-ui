import { DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import type { Dto } from '../../../shared/api/types';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { LEGAL_ENTITY_CREATE_FIELDS,
  LEGAL_ENTITY_EDIT_FIELDS,
  createLegalEntityBody,
  legalEntityFormValues,
  updateLegalEntityBody } from '../client-forms';
import { LEGAL_ENTITY_TRANSITIONS,
  clientsApi,
  uuidRef,
  type ClientDetail,
  type LegalEntity,
  type LegalEntityStatus } from '../clients-api';
import { clientKeys } from '../clients-queries';

/** Who an invoice is billed to: every legal entity of one client. */
export function LegalEntitiesSection({ client }: { client: ClientDetail }) { const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LegalEntity | null>(null);
  const [target, setTarget] = useState<{ entity: LegalEntity; status: LegalEntityStatus } | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const readonly = client.status === 'ARCHIVED';
  const canManage = can(PERMISSIONS.CLIENTS_MANAGE) && !readonly;

  /** Brands and groups that name an entity: CORE refuses to archive those. */
  const usage = useMemo(() => { const counts = new Map<string, { brands: number; groups: number }>();
    const add = (id: string | null | undefined, key: 'brands' | 'groups') => { if (!id) return;
      const current = counts.get(id) ?? { brands: 0, groups: 0 };
      current[key] += 1;
      counts.set(id, current);
    };
    for (const brand of [...client.groups.flatMap((group) => group.brands), ...client.brands]) { add(uuidRef(brand.legal_entity_id), 'brands');
    }
    for (const group of client.groups) add(group.default_legal_entity_id, 'groups');
    return counts;
  }, [client]);

  const create = useApiMutation(
    (body: ReturnType<typeof createLegalEntityBody>) => clientsApi.createLegalEntity(client.id, body),
    { success: 'Legal entity ditambahkan', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { legalEntityId: string; body: ReturnType<typeof updateLegalEntityBody> }) =>
      clientsApi.updateLegalEntity(client.id, input.legalEntityId, input.body),
    { success: 'Legal entity tersimpan', invalidate, toastErrors: false },
  );
  const changeStatus = useApiMutation(
    (input: { legalEntityId: string; body: Dto<'LegalEntityLifecycleTransitionDto'> }) =>
      clientsApi.transitionLegalEntity(client.id, input.legalEntityId, input.body),
    { success: (result) => `Legal entity sekarang ${labelFor(result.status).toLowerCase()}`,
      invalidate,
      toastErrors: false },
  );

  const columns: TableColumn<LegalEntity>[] = [
    { key: 'name',
      label: 'Nama',
      render: (entity) => <Identity primary={entity.name} secondary={entity.legal_name} /> },
    { key: 'tax_identifier', label: 'NPWP', width: '200px', render: (entity) => valueOrNotSet(entity.tax_identifier) },
    { key: 'email', label: 'Email', width: '220px', render: (entity) => valueOrNotSet(entity.email) },
    { key: 'status', label: 'Status', width: '150px', render: (entity) => <StatusBadge status={entity.status} /> },
    { key: 'usage',
      label: 'Dipakai',
      render: (entity) => { const used = usage.get(entity.id);
        if (!used) return <span className="not-set">Belum dipakai</span>;
        const parts = [used.brands ? `${used.brands} brand` : null, used.groups ? `${used.groups} group` : null];
        return parts.filter(Boolean).join(' · ');
      } },
  ];

  const actions: TableAction<LegalEntity>[] = [];
  if (canManage) actions.push({ label: 'Edit', onClick: setEditing });
  if (can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE) && !readonly) { for (const status of ['ACTIVE', 'ARCHIVED'] as const) { actions.push({ label: transitionLabel(status),
        variant: status === 'ARCHIVED' ? 'danger' : 'default',
        show: (entity) => LEGAL_ENTITY_TRANSITIONS[entity.status].includes(status),
        onClick: (entity) => setTarget({ entity, status }) });
    }
  }

  return (
    <>
      <Section
        title="Legal entity client"
        actions={ canManage ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
              Tambah legal entity
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={columns}
          data={client.legal_entities}
          rowKey="id"
          actions={actions.length ? actions : undefined}
          emptyMessage="Belum ada legal entity. Invoice ditagih ke nama client ini sendiri. Tambahkan legal entity saat ada brand atau group yang menagih atas nama badan lain."
        />
      </Section>

      <FormDialog
        open={creating}
        title="Tambah legal entity"
        description="Badan hukum yang bisa dipilih sebagai pihak penagihan brand atau group."
        fields={LEGAL_ENTITY_CREATE_FIELDS}
        initialValues={legalEntityFormValues()}
        submitLabel="Tambah legal entity"
        onSubmit={(values) => create.mutateAsync(createLegalEntityBody(values))}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit legal entity"
        description={editing?.name}
        fields={LEGAL_ENTITY_EDIT_FIELDS}
        initialValues={legalEntityFormValues(editing ?? undefined)}
        submitLabel="Simpan legal entity"
        onSubmit={(values) => update.mutateAsync({ legalEntityId: editing!.id, body: updateLegalEntityBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${target ? transitionLabel(target.status) : ''} ${target?.entity.name ?? ''}`}
        message={ target?.status === 'ARCHIVED'
            ? 'Legal entity yang diarsipkan tidak bisa diubah dan tidak bisa dipilih lagi. CORE menolaknya selama masih ada brand atau group yang menunjuknya.'
            : 'Legal entity kembali aktif dan bisa dipilih lagi sebagai pihak penagihan.'
        }
        confirmLabel={target ? transitionLabel(target.status) : ''}
        tone={target?.status === 'ARCHIVED' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) =>
          changeStatus.mutateAsync({ legalEntityId: target!.entity.id,
            body: { target_status: target!.status, reason: read.text(values, 'reason') } })
        }
        onClose={() => setTarget(null)}
      />
    </>
  );
}

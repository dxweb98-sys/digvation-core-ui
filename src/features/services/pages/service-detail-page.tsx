import { DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { targetLabel, useTransitions } from '../../../shared/forms/use-transitions';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { ServiceContractSection } from '../../contracts/components/service-contract-section';
import { useAddOns, useFeatures } from '../../catalog/catalog-queries';
import { clientKeys } from '../../clients/clients-queries';
import { SERVICE_TRANSITIONS, isOpenService, servicesApi, type HeldAddOn, type Service, type ServiceStatus } from '../services-api';
import { serviceKeys, useService } from '../services-queries';

const STATUS_MESSAGES: Partial<Record<ServiceStatus, string>> = {
  TRIAL: 'The client can use the service on trial.',
  ACTIVE: 'The service is live and billable under its contract.',
  SUSPENDED: 'The service is paused. It can be reactivated.',
  CANCELLED: 'A cancelled service cannot be reopened. Its features and add-ons can no longer change.',
  DECOMMISSIONED: 'The service is taken down for good. CORE refuses while it is still hosted on an installation.',
};

const ADD_ON_COLUMNS: TableColumn<HeldAddOn>[] = [
  { key: 'name', label: 'Add-on', render: (addOn) => <Identity primary={addOn.name} secondary={addOn.code} /> },
  { key: 'status', label: 'Status', render: (addOn) => <StatusBadge status={addOn.status} /> },
  { key: 'status_changed_at', label: 'Since', render: (addOn) => formatInstant(addOn.status_changed_at) },
];

function ServiceView({ service }: { service: Service }) {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.SERVICES_MANAGE);
  const canReadCatalog = can(PERMISSIONS.CATALOG_READ);
  const open = isOpenService(service.status);
  const features = useFeatures(service.product.id, canManage && canReadCatalog && open);
  const addOns = useAddOns(service.product.id, canManage && canReadCatalog && open);
  const [editingFeatures, setEditingFeatures] = useState(false);
  const [addingAddOn, setAddingAddOn] = useState(false);
  const [target, setTarget] = useState<ServiceStatus | null>(null);
  const invalidate = [serviceKeys.all, clientKeys.detail(service.client_id)];

  const saveFeatures = useApiMutation(
    (ids: string[]) => servicesApi.setFeatures(service.client_id, service.id, ids),
    { success: 'Features saved', invalidate, toastErrors: false },
  );
  const addAddOn = useApiMutation((addOnId: string) => servicesApi.addAddOn(service.client_id, service.id, addOnId), {
    success: 'Add-on added',
    invalidate,
    toastErrors: false,
  });
  const transition = useApiMutation(
    (input: { target: ServiceStatus; reason: string }) =>
      servicesApi.transition(service.client_id, service.id, { target_status: input.target, reason: input.reason }),
    { success: 'Service status changed', invalidate, toastErrors: false },
  );
  const addOnTransition = useApiMutation((run: () => Promise<unknown>) => run(), {
    success: 'Add-on status changed',
    invalidate,
    toastErrors: false,
  });
  const addOnTransitions = useTransitions<HeldAddOn>({
    transitions: SERVICE_TRANSITIONS,
    name: (addOn) => addOn.name,
    describe: (_, next) => STATUS_MESSAGES[next as ServiceStatus] ?? '',
    apply: (addOn, next, reason) =>
      addOnTransition.mutateAsync(() =>
        servicesApi.transitionAddOn(service.client_id, service.id, addOn.id, {
          target_status: next as ServiceStatus,
          reason,
        }),
      ),
  });

  const held = new Set(service.add_ons.filter((addOn) => isOpenService(addOn.status)).map((addOn) => addOn.add_on_id));
  const addOnOptions = (addOns.data ?? [])
    .filter(
      (addOn) =>
        addOn.status === 'ACTIVE' &&
        !held.has(addOn.id) &&
        (addOn.scope === 'PRODUCT' || addOn.owner_client_id === service.client_id),
    )
    .map((addOn) => ({ value: addOn.id, label: `${addOn.name} (${addOn.code})` }));
  const featureOptions = (features.data ?? [])
    .filter(
      (feature) =>
        (feature.status === 'ACTIVE' || service.features.some((selected) => selected.id === feature.id)) &&
        (feature.scope === 'PRODUCT' || feature.owner_client_id === service.client_id),
    )
    .map((feature) => ({ value: feature.id, label: feature.name, description: feature.code }));

  return (
    <Page>
      <Link className="app-back-link" to={`/clients/${service.client_id}?tab=services`}>
        ← Client
      </Link>
      <PageHeader
        title={`${service.product.name} for ${service.brand.name}`}
        meta={
          <>
            <Code>{service.product.code}</Code>
            <Code>{service.brand.code}</Code>
            <StatusBadge status={service.status} />
          </>
        }
        actions={
          canManage
            ? SERVICE_TRANSITIONS[service.status].map((status) => (
                <AppAction
                  key={status}
                  tone={status === 'CANCELLED' || status === 'DECOMMISSIONED' ? 'danger-subtle' : 'secondary'}
                  onClick={() => setTarget(status)}
                >
                  {targetLabel(status)}
                </AppAction>
              ))
            : null
        }
      />
      <ServiceContractSection service={service} />
      <Section
        title="Features"
        actions={
          canManage && canReadCatalog && open ? (
            <AppAction tone="secondary" size="sm" onClick={() => setEditingFeatures(true)}>
              Change features
            </AppAction>
          ) : null
        }
      >
        {service.features.length === 0 ? (
          <p className="form-dialog-message">No features selected.</p>
        ) : (
          <span className="app-page-actions">
            {service.features.map((feature) => (
              <span key={feature.id}>
                {feature.name} <Code>{feature.code}</Code>
              </span>
            ))}
          </span>
        )}
      </Section>
      <Section
        title="Add-ons"
        actions={
          canManage && canReadCatalog && open ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingAddOn(true)}>
              Add add-on
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={ADD_ON_COLUMNS}
          data={service.add_ons}
          rowKey="id"
          actions={canManage ? addOnTransitions.actions : undefined}
          emptyMessage={<DEmptyState title="No add-ons" description="Add-ons sell extra features or capabilities on this service." />}
        />
      </Section>

      <FormDialog
        open={editingFeatures}
        title="Features of the service"
        description="Only active features of the product can be added. A retired feature stays until you remove it."
        fields={[{ name: 'feature_ids', label: 'Features', kind: 'checklist', options: featureOptions }]}
        initialValues={{ feature_ids: service.features.map((feature) => feature.id) }}
        submitLabel="Save features"
        onSubmit={(values) => saveFeatures.mutateAsync(read.list(values, 'feature_ids'))}
        onClose={() => setEditingFeatures(false)}
      />
      <FormDialog
        open={addingAddOn}
        title="Add add-on"
        description="The add-on starts in provisioning, like a new service."
        fields={[
          {
            name: 'add_on_id',
            label: 'Add-on',
            kind: 'select',
            required: true,
            options: addOnOptions,
            hint: addOnOptions.length === 0 ? 'No active add-on of this product is left to add.' : undefined,
          },
        ]}
        submitLabel="Add add-on"
        onSubmit={(values) => addAddOn.mutateAsync(read.text(values, 'add_on_id'))}
        onClose={() => setAddingAddOn(false)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${targetLabel(target ?? '')} service`}
        message={target ? (STATUS_MESSAGES[target] ?? '') : ''}
        confirmLabel={targetLabel(target ?? '')}
        tone={target === 'CANCELLED' || target === 'DECOMMISSIONED' || target === 'SUSPENDED' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => transition.mutateAsync({ target: target!, reason: read.text(values, 'reason') })}
        onClose={() => setTarget(null)}
      />
      {addOnTransitions.dialog}
    </Page>
  );
}

export function ServiceDetailPage() {
  const { clientId = '', serviceId = '' } = useParams();
  const service = useService(clientId, serviceId);
  return <QueryState query={service} label="service">{(data) => <ServiceView service={data} />}</QueryState>;
}

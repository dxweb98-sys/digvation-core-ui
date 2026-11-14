import { DAlert } from '@digvation/ui';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { usePrices } from '../../catalog/catalog-queries';
import { serviceKeys } from '../../services/services-queries';
import { ContractAddOnsSection } from '../components/contract-add-ons-section';
import { TermsSection } from '../components/terms-section';
import { CONTRACT_SETTINGS_FIELDS, contractSettingsBody, contractSettingsValues } from '../contract-settings';
import { CANCELLABLE, contractsApi, type Contract } from '../contracts-api';
import { contractKeys, useContract } from '../contracts-queries';

function ContractView({ contract }: { contract: Contract }) {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.CONTRACTS_MANAGE);
  const prices = usePrices(contract.service.product.id, can(PERMISSIONS.CATALOG_READ));
  const [editing, setEditing] = useState(false);
  const [pausing, setPausing] = useState<'SUSPENDED' | 'ACTIVE' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const invalidate = [contractKeys.all, serviceKeys.all];

  const update = useApiMutation(
    (values: Parameters<typeof contractSettingsBody>[0]) => contractsApi.update(contract.id, contractSettingsBody(values)),
    { success: 'Contract saved', invalidate, toastErrors: false },
  );
  const transition = useApiMutation(
    (input: { target: 'SUSPENDED' | 'ACTIVE'; reason: string }) =>
      contractsApi.transition(contract.id, { target_status: input.target, reason: input.reason }),
    { success: (_, input) => (input.target === 'SUSPENDED' ? 'Contract suspended' : 'Contract resumed'), invalidate, toastErrors: false },
  );
  const cancel = useApiMutation(
    (input: { reason: string; effective_on: string }) => contractsApi.cancel(contract.id, input),
    { success: 'Contract cancellation recorded', invalidate, toastErrors: false },
  );

  const service = contract.service;
  const running = contract.terms.find((term) => term.status === 'ACTIVE');

  return (
    <Page>
      <Link className="app-back-link" to="/contracts">
        ← Contracts
      </Link>
      <PageHeader
        title={`${service.product.name} for ${service.brand.name}`}
        meta={
          <>
            <Link to={`/clients/${service.client.id}?tab=contracts`}>{service.client.display_name}</Link>
            <Code>{service.client.code}</Code>
            <StatusBadge status={contract.status} />
            {contract.contract_reference ? <span>Ref {contract.contract_reference}</span> : null}
          </>
        }
        actions={
          canManage ? (
            <>
              {contract.status === 'TRIAL' || contract.status === 'ACTIVE' ? (
                <AppAction tone="secondary" onClick={() => setPausing('SUSPENDED')}>
                  Suspend
                </AppAction>
              ) : null}
              {contract.status === 'SUSPENDED' ? (
                <AppAction tone="secondary" onClick={() => setPausing('ACTIVE')}>
                  Resume
                </AppAction>
              ) : null}
              {CANCELLABLE.includes(contract.status) && !contract.cancel_effective_on ? (
                <AppAction tone="danger-subtle" onClick={() => setCancelling(true)}>
                  Cancel contract
                </AppAction>
              ) : null}
              <AppAction onClick={() => setEditing(true)}>Edit settings</AppAction>
            </>
          ) : null
        }
      />
      {contract.cancel_effective_on ? (
        <DAlert variant="warning">
          Cancelled: the last day is {formatBusinessDate(contract.cancel_effective_on)}.
          {contract.cancel_reason ? ` Reason: ${contract.cancel_reason}` : ''}
        </DAlert>
      ) : null}
      <Section title="Settings">
        <DetailList>
          <DetailItem label="Billable">{contract.billable ? 'Yes' : 'No (complimentary)'}</DetailItem>
          <DetailItem label="Renews automatically">{contract.auto_renew ? 'Yes' : 'No'}</DetailItem>
          <DetailItem label="Renewal notice">{`${contract.renewal_notice_days} days`}</DetailItem>
          <DetailItem label="Grace period">{`${contract.grace_period_days} days`}</DetailItem>
          <DetailItem label="Running term">
            {running ? `${formatBusinessDate(running.starts_on)} – ${formatBusinessDate(running.ends_on)}` : undefined}
          </DetailItem>
          <DetailItem label="Status since">{formatInstant(contract.status_changed_at)}</DetailItem>
        </DetailList>
      </Section>
      <TermsSection contract={contract} prices={prices.data ?? []} canManage={canManage} />
      <ContractAddOnsSection contract={contract} canManage={canManage} />

      <FormDialog
        open={editing}
        title="Contract settings"
        fields={CONTRACT_SETTINGS_FIELDS}
        initialValues={contractSettingsValues(contract)}
        submitLabel="Save settings"
        onSubmit={(values) => update.mutateAsync(values)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={pausing !== null}
        title={pausing === 'SUSPENDED' ? 'Suspend contract' : 'Resume contract'}
        message={
          pausing === 'SUSPENDED'
            ? 'The contract and its service are paused. Nothing is billed for the paused time.'
            : 'The contract and its service continue.'
        }
        confirmLabel={pausing === 'SUSPENDED' ? 'Suspend' : 'Resume'}
        tone={pausing === 'SUSPENDED' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => transition.mutateAsync({ target: pausing!, reason: read.text(values, 'reason') })}
        onClose={() => setPausing(null)}
      />
      <ConfirmDialog
        open={cancelling}
        title="Cancel contract"
        message="Draft and scheduled terms are cancelled at once. The running term continues until the last day you choose; then the contract becomes cancelled."
        confirmLabel="Cancel contract"
        extraFields={[{ name: 'effective_on', label: 'Last day of the running term', kind: 'date', required: true }]}
        reason={{}}
        onConfirm={(values) =>
          cancel.mutateAsync({ reason: read.text(values, 'reason'), effective_on: read.text(values, 'effective_on') })
        }
        onClose={() => setCancelling(false)}
      />
    </Page>
  );
}

export function ContractDetailPage() {
  const { contractId = '' } = useParams();
  const contract = useContract(contractId);
  return <QueryState query={contract} label="contract">{(data) => <ContractView contract={data} />}</QueryState>;
}

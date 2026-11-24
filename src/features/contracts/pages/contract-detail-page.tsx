import { DAlert } from '@digvation/ui';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageBreadcrumb, PageHeader, QueryState, Section } from '../../../shared/ui/page';
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
    { success: 'Contract tersimpan', invalidate, toastErrors: false },
  );
  const transition = useApiMutation(
    (input: { target: 'SUSPENDED' | 'ACTIVE'; reason: string }) =>
      contractsApi.transition(contract.id, { target_status: input.target, reason: input.reason }),
    { success: (_, input) => (input.target === 'SUSPENDED' ? 'Contract ditangguhkan' : 'Contract diaktifkan kembali'), invalidate, toastErrors: false },
  );
  const cancel = useApiMutation(
    (input: { reason: string; effective_on: string }) => contractsApi.cancel(contract.id, input),
    { success: 'Pembatalan contract tercatat', invalidate, toastErrors: false },
  );

  const service = contract.service;
  const running = contract.terms.find((term) => term.status === 'ACTIVE');

  return (
    <Page>
      <PageBreadcrumb
        trail={[
          { label: 'Contracts', to: '/contracts' },
          { label: `${service.product.name} untuk ${service.brand.name}` },
        ]}
      />
      <PageHeader
        title={`${service.product.name} untuk ${service.brand.name}`}
        meta={
          <>
            <Link to={`/clients/${service.client.id}?tab=contracts`}>{service.client.display_name}</Link>
            <Code>{service.client.code}</Code>
            <StatusBadge status={contract.status} />
            {contract.contract_reference ? <span>Referensi {contract.contract_reference}</span> : null}
          </>
        }
        actions={
          canManage ? (
            <>
              {contract.status === 'TRIAL' || contract.status === 'ACTIVE' ? (
                <AppAction tone="secondary" onClick={() => setPausing('SUSPENDED')}>
                  Tangguhkan
                </AppAction>
              ) : null}
              {contract.status === 'SUSPENDED' ? (
                <AppAction tone="secondary" onClick={() => setPausing('ACTIVE')}>
                  Aktifkan kembali
                </AppAction>
              ) : null}
              {CANCELLABLE.includes(contract.status) && !contract.cancel_effective_on ? (
                <AppAction tone="danger-subtle" onClick={() => setCancelling(true)}>
                  Batalkan contract
                </AppAction>
              ) : null}
              <AppAction onClick={() => setEditing(true)}>Ubah pengaturan</AppAction>
            </>
          ) : null
        }
      />
      {contract.cancel_effective_on ? (
        <DAlert variant="warning">
          Dibatalkan: hari terakhir adalah {formatBusinessDate(contract.cancel_effective_on)}.
          {contract.cancel_reason ? ` Alasan: ${contract.cancel_reason}` : ''}
        </DAlert>
      ) : null}
      <Section title="Pengaturan">
        <DetailList>
          <DetailItem label="Ditagih">{contract.billable ? 'Ya' : 'Tidak (gratis)'}</DetailItem>
          <DetailItem label="Perpanjangan otomatis">{contract.auto_renew ? 'Ya' : 'Tidak'}</DetailItem>
          <DetailItem label="Pemberitahuan perpanjangan">{`${contract.renewal_notice_days} hari`}</DetailItem>
          <DetailItem label="Masa tenggang">{`${contract.grace_period_days} hari`}</DetailItem>
          <DetailItem label="Term berjalan">
            {running ? `${formatBusinessDate(running.starts_on)} – ${formatBusinessDate(running.ends_on)}` : undefined}
          </DetailItem>
          <DetailItem label="Status sejak">{formatInstant(contract.status_changed_at)}</DetailItem>
        </DetailList>
      </Section>
      <TermsSection contract={contract} prices={prices.data ?? []} canManage={canManage} />
      <ContractAddOnsSection contract={contract} canManage={canManage} />

      <FormDialog
        open={editing}
        title="Pengaturan contract"
        fields={CONTRACT_SETTINGS_FIELDS}
        initialValues={contractSettingsValues(contract)}
        submitLabel="Simpan pengaturan"
        onSubmit={(values) => update.mutateAsync(values)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={pausing !== null}
        title={pausing === 'SUSPENDED' ? 'Tangguhkan contract' : 'Aktifkan kembali contract'}
        message={
          pausing === 'SUSPENDED'
            ? 'Contract dan service-nya ditangguhkan. Tidak ada tagihan selama masa penangguhan.'
            : 'Contract dan service-nya berjalan kembali.'
        }
        confirmLabel={pausing === 'SUSPENDED' ? 'Tangguhkan' : 'Aktifkan kembali'}
        tone={pausing === 'SUSPENDED' ? 'danger' : 'primary'}
        reason={{}}
        onConfirm={(values) => transition.mutateAsync({ target: pausing!, reason: read.text(values, 'reason') })}
        onClose={() => setPausing(null)}
      />
      <ConfirmDialog
        open={cancelling}
        title="Batalkan contract"
        message="Term berstatus draf dan term terjadwal langsung dibatalkan. Term yang berjalan tetap berlaku sampai hari terakhir yang Anda pilih; setelah itu contract menjadi dibatalkan."
        confirmLabel="Batalkan contract"
        extraFields={[{ name: 'effective_on', label: 'Hari terakhir term berjalan', kind: 'date', required: true }]}
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

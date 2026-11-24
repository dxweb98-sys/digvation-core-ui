import { DAlert, DDataTable, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { billingApi, type BillingSettings, type TaxRate } from '../billing-api';
import { billingKeys, useBillingSettings, useSettingsRevisions } from '../billing-queries';
import { SETTINGS_FIELDS,
  formatPercent,
  overlappingRates,
  percentToBasisPoints,
  settingsBody,
  settingsValues,
  taxRateInputs } from '../billing-settings-form';

const RATE_COLUMNS: TableColumn<TaxRate>[] = [
  { key: 'name', label: 'Pajak' },
  { key: 'rate_basis_points', label: 'Tarif', align: 'right', render: (rate) => formatPercent(rate.rate_basis_points) },
  { key: 'valid_from', label: 'Mulai', render: (rate) => formatBusinessDate(rate.valid_from) },
  { key: 'valid_until', label: 'Sampai', render: (rate) => (rate.valid_until ? formatBusinessDate(rate.valid_until) : 'Tanpa batas') },
];

function Revisions() { const revisions = useSettingsRevisions();
  return (
    <Section title="Revisi">
      <QueryState query={revisions} label="revisions">
        {(items) => (
          <DDataTable
            columns={[
              { key: 'revision', label: 'Revisi', render: (item) => <Code>{String(item.revision)}</Code> },
              { key: 'created_at', label: 'Disimpan', render: (item) => formatInstant(item.created_at) },
              { key: 'reason', label: 'Alasan' },
              { key: 'source', label: 'Oleh', render: (item) => (item.source === 'user' ? 'Operator' : item.source) },
            ]}
            data={items}
            rowKey="revision"
            emptyMessage="Belum pernah disimpan. Penyimpanan pertama membuat revisi 1."
          />
        )}
      </QueryState>
    </Section>
  );
}

function SettingsView({ settings }: { settings: BillingSettings }) { const { can } = usePermissions();
  const canManage = can(PERMISSIONS.BILLING_SETTINGS_MANAGE);
  const [editing, setEditing] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [removingRate, setRemovingRate] = useState<TaxRate | null>(null);
  const invalidate = [billingKeys.all];
  const save = useApiMutation(billingApi.saveSettings, { success: 'Pengaturan billing disimpan', invalidate, toastErrors: false });
  const current = taxRateInputs(settings.tax_rates);

  /** The tax rates after adding the one in the form (and ending the open one if asked). */
  function ratesWith(values: Parameters<typeof read.text>[0]) { const from = read.text(values, 'valid_from');
    const dayBefore = new Date(`${from}T00:00:00Z`);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const previous = current.map((rate) =>
      read.bool(values, 'end_previous') && !rate.valid_until && rate.valid_from < from
        ? { ...rate, valid_until: dayBefore.toISOString().slice(0, 10) }
        : rate,
    );
    return [
      ...previous,
      { name: read.text(values, 'name'),
        rate_basis_points: percentToBasisPoints(read.text(values, 'rate')) ?? 0,
        valid_from: from,
        valid_until: read.optional(values, 'valid_until') },
    ];
  }

  return (
    <Page>
      <PageHeader
        title="Pengaturan billing"
        description="Siapa yang menerbitkan invoice, cara penomorannya, cara pembayaran, dan pajak yang berlaku."
        actions={canManage ? <AppAction onClick={() => setEditing(true)}>Ubah pengaturan</AppAction> : null}
      />
      {!settings.configured ? (
        <DAlert variant="warning">Pengaturan billing belum disimpan. Invoice belum dapat diterbitkan sebelum pengaturan ini disimpan.</DAlert>
      ) : null}
      <Section title="Penerbit">
        <DetailList>
          <DetailItem label="Nama legal">{settings.issuer_legal_name}</DetailItem>
          <DetailItem label="NPWP">{settings.issuer_tax_identifier}</DetailItem>
          <DetailItem label="Email">{settings.issuer_email}</DetailItem>
          <DetailItem label="Telepon">{settings.issuer_phone}</DetailItem>
          <DetailItem label="Alamat" wide>
            {settings.issuer_address}
          </DetailItem>
          <DetailItem label="Instruksi pembayaran" wide>
            {settings.payment_instructions}
          </DetailItem>
          <DetailItem label="Penomoran invoice">
            <Code>{settings.invoice_number_pattern}</Code>
          </DetailItem>
          <DetailItem label="Penomoran credit note">
            <Code>{settings.credit_note_number_pattern}</Code>
          </DetailItem>
          <DetailItem label="Batas awal draf">{`${settings.draft_lead_days} hari`}</DetailItem>
          <DetailItem label="Currency">{settings.default_currency}</DetailItem>
        </DetailList>
      </Section>
      <Section
        title="Tarif pajak"
        actions={ canManage && settings.configured ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingRate(true)}>
              Tambah tarif pajak
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={RATE_COLUMNS}
          data={settings.tax_rates}
          rowKey="id"
          actions={canManage ? [{ label: 'Hapus', variant: 'danger', onClick: setRemovingRate }] : undefined}
          emptyMessage="Belum ada tarif pajak. Invoice tanpa pajak sampai sebuah tarif ditambahkan."
        />
      </Section>
      <Revisions />

      <FormDialog
        open={editing}
        kind="wide"
        title="Pengaturan billing"
        fields={SETTINGS_FIELDS}
        initialValues={settingsValues(settings)}
        submitLabel="Simpan pengaturan"
        onSubmit={(values) => save.mutateAsync(settingsBody(settings, values, current, read.text(values, 'reason')))}
        onClose={() => setEditing(false)}
      />
      <FormDialog
        open={addingRate}
        title="Tambah tarif pajak"
        description="Untuk mengubah tarif, akhiri tarif yang berjalan satu hari sebelum tarif baru mulai. Periode tidak boleh tumpang tindih."
        fields={[
          { name: 'name', label: 'Nama', required: true, half: true, placeholder: 'PPN' },
          { name: 'rate',
            label: 'Tarif (%)',
            required: true,
            half: true,
            placeholder: '11',
            validate: (value) =>
              typeof value === 'string' && value.trim() && percentToBasisPoints(value) === undefined
                ? 'Masukkan persentase dari 0 sampai 100, misalnya 11 atau 11,5.'
                : undefined },
          { name: 'valid_from',
            label: 'Berlaku dari',
            kind: 'date',
            required: true,
            half: true,
            validate: (_, values) =>
              read.text(values, 'valid_from') && overlappingRates(ratesWith(values))
                ? 'Periode ini tumpang tindih dengan tarif lain. Akhiri dulu tarif yang masih berjalan.'
                : undefined },
          { name: 'valid_until', label: 'Berlaku sampai', kind: 'date', half: true, hint: 'Biarkan kosong selama tarif ini masih berlaku.' },
          { name: 'end_previous',
            label: 'Akhiri tarif yang berjalan satu hari sebelumnya',
            kind: 'toggle',
            visible: () => current.some((rate) => !rate.valid_until) },
          { name: 'reason', label: 'Alasan', kind: 'textarea', required: true, maxLength: 500 },
        ]}
        submitLabel="Tambah tarif pajak"
        onSubmit={(values) => save.mutateAsync(settingsBody(settings, null, ratesWith(values), read.text(values, 'reason')))}
        onClose={() => setAddingRate(false)}
      />
      <ConfirmDialog
        open={removingRate !== null}
        title="Hapus tarif pajak"
        message={`${removingRate?.name ?? ''} ${removingRate ? formatPercent(removingRate.rate_basis_points) : ''} dihapus. Invoice yang sudah terbit tetap memakai pajak saat diterbitkan.`}
        confirmLabel="Hapus"
        reason={{}}
        onConfirm={(values) =>
          save.mutateAsync(
            settingsBody(
              settings,
              null,
              taxRateInputs(settings.tax_rates.filter((rate) => rate.id !== removingRate!.id)),
              read.text(values, 'reason'),
            ),
          )
        }
        onClose={() => setRemovingRate(null)}
      />
    </Page>
  );
}

export function BillingSettingsPage() { const settings = useBillingSettings();
  return <QueryState query={settings} label="billing settings">{(data) => <SettingsView settings={data} />}</QueryState>;
}

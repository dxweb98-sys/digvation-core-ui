import { DAlert, DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
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
import {
  SETTINGS_FIELDS,
  formatPercent,
  overlappingRates,
  percentToBasisPoints,
  settingsBody,
  settingsValues,
  taxRateInputs,
} from '../billing-settings-form';

const RATE_COLUMNS: TableColumn<TaxRate>[] = [
  { key: 'name', label: 'Tax' },
  { key: 'rate_basis_points', label: 'Rate', align: 'right', render: (rate) => formatPercent(rate.rate_basis_points) },
  { key: 'valid_from', label: 'From', render: (rate) => formatBusinessDate(rate.valid_from) },
  { key: 'valid_until', label: 'Until', render: (rate) => (rate.valid_until ? formatBusinessDate(rate.valid_until) : 'Open') },
];

function Revisions() {
  const revisions = useSettingsRevisions();
  return (
    <Section title="Revisions">
      <QueryState query={revisions} label="revisions">
        {(items) => (
          <DDataTable
            columns={[
              { key: 'revision', label: 'Revision', render: (item) => <Code>{String(item.revision)}</Code> },
              { key: 'created_at', label: 'Saved', render: (item) => formatInstant(item.created_at) },
              { key: 'reason', label: 'Reason' },
              { key: 'source', label: 'By', render: (item) => (item.source === 'user' ? 'Operator' : item.source) },
            ]}
            data={items}
            rowKey="revision"
            emptyMessage={<DEmptyState title="Never saved" description="The first save creates revision 1." />}
          />
        )}
      </QueryState>
    </Section>
  );
}

function SettingsView({ settings }: { settings: BillingSettings }) {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.BILLING_SETTINGS_MANAGE);
  const [editing, setEditing] = useState(false);
  const [addingRate, setAddingRate] = useState(false);
  const [removingRate, setRemovingRate] = useState<TaxRate | null>(null);
  const invalidate = [billingKeys.all];
  const save = useApiMutation(billingApi.saveSettings, { success: 'Billing settings saved', invalidate, toastErrors: false });
  const current = taxRateInputs(settings.tax_rates);

  /** The tax rates after adding the one in the form (and ending the open one if asked). */
  function ratesWith(values: Parameters<typeof read.text>[0]) {
    const from = read.text(values, 'valid_from');
    const dayBefore = new Date(`${from}T00:00:00Z`);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const previous = current.map((rate) =>
      read.bool(values, 'end_previous') && !rate.valid_until && rate.valid_from < from
        ? { ...rate, valid_until: dayBefore.toISOString().slice(0, 10) }
        : rate,
    );
    return [
      ...previous,
      {
        name: read.text(values, 'name'),
        rate_basis_points: percentToBasisPoints(read.text(values, 'rate')) ?? 0,
        valid_from: from,
        valid_until: read.optional(values, 'valid_until'),
      },
    ];
  }

  return (
    <Page>
      <PageHeader
        title="Billing settings"
        description="Who issues invoices, how they are numbered, how to pay, and which tax applies."
        actions={canManage ? <AppAction onClick={() => setEditing(true)}>Edit settings</AppAction> : null}
      />
      {!settings.configured ? (
        <DAlert variant="warning">Billing settings are not saved yet. Invoices cannot be issued until they are.</DAlert>
      ) : null}
      <Section title="Issuer">
        <DetailList>
          <DetailItem label="Legal name">{settings.issuer_legal_name}</DetailItem>
          <DetailItem label="NPWP">{settings.issuer_tax_identifier}</DetailItem>
          <DetailItem label="Email">{settings.issuer_email}</DetailItem>
          <DetailItem label="Phone">{settings.issuer_phone}</DetailItem>
          <DetailItem label="Address" wide>
            {settings.issuer_address}
          </DetailItem>
          <DetailItem label="Payment instructions" wide>
            {settings.payment_instructions}
          </DetailItem>
          <DetailItem label="Invoice numbers">
            <Code>{settings.invoice_number_pattern}</Code>
          </DetailItem>
          <DetailItem label="Credit note numbers">
            <Code>{settings.credit_note_number_pattern}</Code>
          </DetailItem>
          <DetailItem label="Draft lead time">{`${settings.draft_lead_days} days`}</DetailItem>
          <DetailItem label="Currency">{settings.default_currency}</DetailItem>
        </DetailList>
      </Section>
      <Section
        title="Tax rates"
        actions={
          canManage && settings.configured ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setAddingRate(true)}>
              Add tax rate
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={RATE_COLUMNS}
          data={settings.tax_rates}
          rowKey="id"
          actions={canManage ? [{ label: 'Remove', variant: 'danger', onClick: setRemovingRate }] : undefined}
          emptyMessage={<DEmptyState title="No tax rates" description="Invoices carry no tax until a rate is added." />}
        />
      </Section>
      <Revisions />

      <FormDialog
        open={editing}
        kind="wide"
        title="Billing settings"
        fields={SETTINGS_FIELDS}
        initialValues={settingsValues(settings)}
        submitLabel="Save settings"
        onSubmit={(values) => save.mutateAsync(settingsBody(settings, values, current, read.text(values, 'reason')))}
        onClose={() => setEditing(false)}
      />
      <FormDialog
        open={addingRate}
        title="Add tax rate"
        description="To change a rate, end the current one the day before the new one starts. Periods must not overlap."
        fields={[
          { name: 'name', label: 'Name', required: true, half: true, placeholder: 'PPN' },
          {
            name: 'rate',
            label: 'Rate (%)',
            required: true,
            half: true,
            placeholder: '11',
            validate: (value) =>
              typeof value === 'string' && value.trim() && percentToBasisPoints(value) === undefined
                ? 'Enter a percentage from 0 to 100, such as 11 or 11,5.'
                : undefined,
          },
          {
            name: 'valid_from',
            label: 'Valid from',
            kind: 'date',
            required: true,
            half: true,
            validate: (_, values) =>
              read.text(values, 'valid_from') && overlappingRates(ratesWith(values))
                ? 'This period overlaps another rate. End the open rate first.'
                : undefined,
          },
          { name: 'valid_until', label: 'Valid until', kind: 'date', half: true, hint: 'Leave empty while it applies.' },
          {
            name: 'end_previous',
            label: 'End the open rate the day before',
            kind: 'toggle',
            visible: () => current.some((rate) => !rate.valid_until),
          },
          { name: 'reason', label: 'Reason', kind: 'textarea', required: true, maxLength: 500 },
        ]}
        submitLabel="Add tax rate"
        onSubmit={(values) => save.mutateAsync(settingsBody(settings, null, ratesWith(values), read.text(values, 'reason')))}
        onClose={() => setAddingRate(false)}
      />
      <ConfirmDialog
        open={removingRate !== null}
        title="Remove tax rate"
        message={`${removingRate?.name ?? ''} ${removingRate ? formatPercent(removingRate.rate_basis_points) : ''} is removed. Issued invoices keep the tax they were issued with.`}
        confirmLabel="Remove"
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

export function BillingSettingsPage() {
  const settings = useBillingSettings();
  return <QueryState query={settings} label="billing settings">{(data) => <SettingsView settings={data} />}</QueryState>;
}

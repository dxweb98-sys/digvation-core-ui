import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput, AppSelect } from '../../../shared/ui/form-fields';
import { labelFor } from '../../../shared/labels/labels';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DConnectionError, DDataTable, DEmptyState, useToast, type TableColumn } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useClientProducts } from '../../client-products/hooks/use-client-products';
import { formatMoney } from '../../commercial-catalog/utils/money';
import {
  useClientCommercial,
  useTransitionSubscriptionAddOn,
  useUpdateProductConfiguration,
} from '../hooks/use-client-commercial';
import type {
  ClientProductCommercialSummary,
  ProductConfiguration,
  SubscriptionAddOn,
  SubscriptionAddOnStatus,
  SubscriptionTerm,
} from '../types/subscription';
import {
  InitialSubscriptionDialog,
  RenewalDialog,
} from './subscription-term-dialogs';
import { SubscriptionAddOnDialog } from './subscription-add-on-dialog';
import '../subscriptions.css';

function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : 'No end date';
}

function expiry(summary: ClientProductCommercialSummary) {
  const end = summary.currentTerm?.endsAt;
  if (!end) return 'No fixed expiry';
  const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Expired';
  return days <= (summary.subscription?.renewalNoticeDays ?? 0)
    ? `Follow up in ${days} days`
    : `${days} days remaining`;
}

function termContext(summary: ClientProductCommercialSummary) {
  if (summary.currentTerm) {
    return {
      term: summary.currentTerm,
      heading: 'Current subscription',
      label: 'Current term',
      hint: expiry(summary),
      isEffective: true,
    };
  }
  if (!summary.latestTerm) return null;
  const startsInFuture = new Date(summary.latestTerm.startsAt).getTime() > Date.now();
  return {
    term: summary.latestTerm,
    heading: startsInFuture ? 'Scheduled subscription' : 'Subscription history',
    label: startsInFuture ? 'Latest scheduled term' : 'Last contract term',
    hint: startsInFuture
      ? `Starts ${date(summary.latestTerm.startsAt)}`
      : 'No term is effective today',
    isEffective: false,
  };
}

const TERM_COLUMNS: TableColumn<SubscriptionTerm>[] = [
  {
    key: 'startsAt',
    label: 'Term',
    render: (term) => `${date(term.startsAt)} → ${date(term.endsAt)}`,
  },
  { key: 'billingCycle', label: 'Billing cycle', render: (term) => labelFor(term.billingCycle) },
  {
    key: 'listAmountMinor',
    label: 'List price',
    render: (term) => formatMoney(term.listAmountMinor, term.currency),
  },
  {
    key: 'agreedAmountMinor',
    label: 'Agreed price',
    render: (term) => formatMoney(term.agreedAmountMinor, term.currency),
  },
  {
    key: 'adjustmentType',
    label: 'Adjustment',
    render: (term) => labelFor(term.adjustmentType),
  },
  {
    key: 'renewedFromTermId',
    label: 'Type',
    render: (term) => (term.renewedFromTermId ? 'Renewal' : 'Initial'),
  },
];

const ADD_ON_COLUMNS: TableColumn<SubscriptionAddOn>[] = [
  {
    key: 'addOnName',
    label: 'Add-on',
    render: (item) => (
      <div className="client-commercial-product-name">
        <strong>{item.addOnName}</strong>
        <code>{item.addOnCode}</code>
      </div>
    ),
  },
  { key: 'status', label: 'Status', render: (item) => labelFor(item.status) },
  {
    key: 'effectiveFrom',
    label: 'Effective period',
    render: (item) =>
      `${date(item.effectiveFrom)} → ${date(item.effectiveUntil)}`,
  },
  {
    key: 'agreedAmountMinor',
    label: 'Recurring agreed',
    render: (item) => formatMoney(item.agreedAmountMinor, item.currency),
  },
  {
    key: 'initialProratedAmountMinor',
    label: 'Initial prorated',
    render: (item) =>
      formatMoney(item.initialProratedAmountMinor, item.currency),
  },
];

function ConfigurationDialog({
  summary,
  onClose,
}: {
  summary: ClientProductCommercialSummary;
  onClose: () => void;
}) {
  const mutation = useUpdateProductConfiguration();
  const { showToast } = useToast();
  const [configurations, setConfigurations] = useState<ProductConfiguration[]>(
    summary.configurations,
  );

  async function save() {
    try {
      await mutation.mutateAsync({
        clientProductId: summary.clientProductId,
        configurations,
      });
      showToast({
        title: 'Product configuration updated',
        variant: 'success',
      });
      onClose();
    } catch (error) {
      showToast({
        title: 'Configuration update failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <AppDialog
      kind="form"
      open
      onClose={onClose}
      title={`${summary.productName} configuration`}
      footer={
        <div className="client-dialog-actions">
          <AppAction tone="secondary" onClick={onClose}>
            Cancel
          </AppAction>
          <AppAction onClick={() => void save()} loading={mutation.isPending}>
            Save
          </AppAction>
        </div>
      }
    >
      <div className="client-contact-form">
        {configurations.map((configuration, index) =>
          configuration.valueType === 'BOOLEAN' ? (
            <AppSelect
              key={configuration.id}
              label={configuration.label}
              value={String(configuration.value)}
              options={[
                { value: 'true', label: 'Enabled' },
                { value: 'false', label: 'Disabled' },
              ]}
              clearable={false}
              onValueChange={(value) => {
                if (value !== 'true' && value !== 'false') return;
                setConfigurations((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, value: value === 'true' }
                      : item,
                  ),
                );
              }}
            />
          ) : (
            <AppInput
              key={configuration.id}
              label={configuration.label}
              type={configuration.valueType === 'INTEGER' ? 'number' : 'text'}
              value={String(configuration.value)}
              hint={configuration.unit}
              onChange={(value) =>
                setConfigurations((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          value:
                            item.valueType === 'INTEGER'
                              ? Number(value || 0)
                              : value,
                        }
                      : item,
                  ),
                )
              }
            />
          ),
        )}
      </div>
    </AppDialog>
  );
}

function AddOnLifecycleDialog({
  addOn,
  targetStatus,
  onClose,
}: {
  addOn: SubscriptionAddOn;
  targetStatus: SubscriptionAddOnStatus;
  onClose: () => void;
}) {
  const mutation = useTransitionSubscriptionAddOn();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const { field, allowSubmit } = useFieldErrors<'reason'>('add-on-status-reason', () =>
    reason.trim() ? {} : { reason: 'Enter a reason.' },
  );

  async function confirm() {
    if (!allowSubmit()) return;
    try {
      await mutation.mutateAsync({
        subscriptionAddOnId: addOn.id,
        targetStatus,
        reason: reason.trim(),
      });
      showToast({ title: 'Add-on status updated', variant: 'success' });
      onClose();
    } catch (error) {
      showToast({
        title: 'Add-on status update failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <AppDialog
      kind="confirm"
      open
      onClose={onClose}
      title={`${targetStatus === 'ACTIVE' ? 'Reactivate' : targetStatus === 'SUSPENDED' ? 'Suspend' : 'Cancel'} ${addOn.addOnName}`}
      footer={
        <div className="client-dialog-actions">
          <AppAction tone="secondary" onClick={onClose}>
            Cancel
          </AppAction>
          <AppAction
            onClick={() => void confirm()}
            loading={mutation.isPending}
          >
            Confirm
          </AppAction>
        </div>
      }
    >
      <div id="add-on-status-reason">
        <AppInput
          {...field('reason')}
          label="Reason"
          placeholder="For example, contract ended on 30 June"
          value={reason}
          maxLength={500}
          onChange={setReason}
        />
      </div>
    </AppDialog>
  );
}

function CommercialRecord({
  summary,
  onConfigure,
  onRenew,
  onSetup,
  onAddOn,
}: {
  summary: ClientProductCommercialSummary;
  onConfigure: () => void;
  onRenew: () => void;
  onSetup: () => void;
  onAddOn: () => void;
}) {
  const context = termContext(summary);
  const term = context?.term;
  const subscriptionCanSellAddOns =
    context?.isEffective === true &&
    (summary.subscription?.status === 'ACTIVE' ||
      summary.subscription?.status === 'TRIAL');
  const [addOnLifecycle, setAddOnLifecycle] = useState<{
    addOn: SubscriptionAddOn;
    targetStatus: SubscriptionAddOnStatus;
  } | null>(null);

  return (
    <section className="client-commercial-item">
      <header className="client-commercial-header">
        <div>
          <h2>{summary.productName}</h2>
          <code>{summary.productCode}</code>
        </div>
        <span
          className={`client-commercial-status is-${(
            summary.subscription?.status ?? 'pending'
          ).toLowerCase()}`}
        >
          {summary.subscription ? labelFor(summary.subscription.status) : 'No subscription'}
        </span>
      </header>

      {term && context ? (
        <>
          <section className="client-commercial-section">
            <h3>{context.heading}</h3>
            <div className="client-commercial-summary">
              <div>
                <span>{context.label}</span>
                <strong>
                  {date(term.startsAt)} → {date(term.endsAt)}
                </strong>
                <small>{context.hint}</small>
              </div>
              <div>
                <span>List price</span>
                <strong>
                  {formatMoney(term.listAmountMinor, term.currency)}
                </strong>
                <small>
                  {labelFor(term.billingCycle)}
                </small>
              </div>
              <div>
                <span>Agreed price</span>
                <strong>
                  {formatMoney(term.agreedAmountMinor, term.currency)}
                </strong>
                <small>
                  {term.adjustmentType === 'NONE'
                    ? 'No adjustment'
                    : `${labelFor(term.adjustmentType)}: ${term.adjustmentReason ?? 'no reason given'}`}
                </small>
              </div>
              <div>
                <span>Renewal</span>
                <strong>
                  {summary.subscription?.autoRenew
                    ? 'Auto renew'
                    : 'Manual renewal'}
                </strong>
                <small>
                  Notice {summary.subscription?.renewalNoticeDays ?? 0} days
                </small>
              </div>
            </div>
            {context.isEffective &&
            (expiry(summary).startsWith('Follow up') ||
              expiry(summary) === 'Expired') ? (
              <p className="client-commercial-attention">{expiry(summary)}</p>
            ) : null}
          </section>

          <section className="client-commercial-section">
            <div className="client-commercial-section-heading">
              <div>
                <h3>Add-ons</h3>
                </div>
              <AppAction icon={Plus} tone="secondary"
                onClick={onAddOn}
                disabled={!subscriptionCanSellAddOns}
                title={
                  subscriptionCanSellAddOns
                    ? undefined
                    : 'Add-ons need a subscription term that covers today.'
                }
              >
                Add add-on
              </AppAction>
            </div>
            {summary.addOns.length ? (
              <>
                <DDataTable
                  columns={ADD_ON_COLUMNS}
                  data={summary.addOns}
                  rowKey="id"
                />
                <div className="client-commercial-addon-actions">
                  {summary.addOns
                    .filter(
                      (item) =>
                        item.status === 'ACTIVE' || item.status === 'SUSPENDED',
                    )
                    .map((item) => (
                      <div key={item.id}>
                        <span>{item.addOnName}</span>
                        {item.status === 'ACTIVE' ? (
                          <AppAction size="sm" tone="secondary"
                            onClick={() =>
                              setAddOnLifecycle({
                                addOn: item,
                                targetStatus: 'SUSPENDED',
                              })
                            }
                          >
                            Suspend
                          </AppAction>
                        ) : (
                          <AppAction size="sm" tone="secondary"
                            onClick={() =>
                              setAddOnLifecycle({
                                addOn: item,
                                targetStatus: 'ACTIVE',
                              })
                            }
                          >
                            Reactivate
                          </AppAction>
                        )}
                        <AppAction size="sm" tone="danger-subtle"
                          onClick={() =>
                            setAddOnLifecycle({
                              addOn: item,
                              targetStatus: 'CANCELLED',
                            })
                          }
                        >
                          Cancel add-on
                        </AppAction>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="client-commercial-empty">
                No add-ons yet.
              </p>
            )}
          </section>

          <section className="client-commercial-section">
            <div className="client-commercial-section-heading">
              <h3>Limits</h3>
              <AppAction icon={Pencil} tone="secondary" onClick={onConfigure}>
                Edit
              </AppAction>
            </div>
            {summary.configurations.length ? (
              <dl className="client-configuration-list">
                {summary.configurations.map((configuration) => (
                  <div key={configuration.id}>
                    <dt>{configuration.label}</dt>
                    <dd>
                      {String(configuration.value)}
                      {configuration.unit ? ` ${configuration.unit}` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="client-commercial-empty">
                No limits set for this product.
              </p>
            )}
          </section>

          <section className="client-commercial-section">
            <div className="client-commercial-section-heading">
              <h3>Term history</h3>
              <AppAction icon={RefreshCw} tone="secondary" onClick={onRenew}>Renew</AppAction>
            </div>
            <DDataTable
              columns={TERM_COLUMNS}
              data={[...summary.terms].sort((left, right) =>
                right.startsAt.localeCompare(left.startsAt),
              )}
              rowKey="id"
            />
          </section>
        </>
      ) : summary.subscription ? (
        <section className="client-commercial-section">
          <h3>Subscription unavailable</h3>
          <p className="client-commercial-empty">
            This subscription has no term yet.
          </p>
        </section>
      ) : (
        <section className="client-commercial-section">
          <h3>Current subscription</h3>
          <p className="client-commercial-empty">
            Set a list price on the product, then set up the subscription.
          </p>
          <div className="client-commercial-actions">
            <AppAction icon={Plus} tone="secondary" onClick={onSetup}>Set up</AppAction>
          </div>
        </section>
      )}

      {addOnLifecycle ? (
        <AddOnLifecycleDialog
          key={`${addOnLifecycle.addOn.id}-${addOnLifecycle.targetStatus}`}
          addOn={addOnLifecycle.addOn}
          targetStatus={addOnLifecycle.targetStatus}
          onClose={() => setAddOnLifecycle(null)}
        />
      ) : null}
    </section>
  );
}

export function ClientCommercialTab({ clientId }: { clientId: string }) {
  const commercialQuery = useClientCommercial(clientId);
  const clientProductsQuery = useClientProducts(clientId);
  const [settingUp, setSettingUp] =
    useState<ClientProductCommercialSummary | null>(null);
  const [renewing, setRenewing] =
    useState<ClientProductCommercialSummary | null>(null);
  const [configuring, setConfiguring] =
    useState<ClientProductCommercialSummary | null>(null);
  const [addingAddOn, setAddingAddOn] =
    useState<ClientProductCommercialSummary | null>(null);

  if (commercialQuery.isPending || clientProductsQuery.isPending) return null;
  if (commercialQuery.isError || clientProductsQuery.isError) {
    return (
      <DConnectionError
        title="Subscriptions unavailable"
        message="Subscriptions could not be loaded."
        onRetry={() => {
          void commercialQuery.refetch();
          void clientProductsQuery.refetch();
        }}
      />
    );
  }

  const known = new Map(
    commercialQuery.data.map((summary) => [summary.clientProductId, summary]),
  );
  const summaries: ClientProductCommercialSummary[] =
    clientProductsQuery.data.map(
      (relationship) =>
        known.get(relationship.id) ?? {
          clientProductId: relationship.id,
          productId: relationship.productId,
          productName: relationship.productName,
          productCode: relationship.productCode,
          terms: [],
          addOns: [],
          configurations: [],
        },
    );

  if (!summaries.length) {
    return (
      <DEmptyState
        title="No products"
        description="Assign a product to this client first."
      />
    );
  }

  return (
    <>
      <div className="client-commercial-list">
        {summaries.map((summary) => (
          <CommercialRecord
            key={summary.clientProductId}
            summary={summary}
            onConfigure={() => setConfiguring(summary)}
            onRenew={() => setRenewing(summary)}
            onSetup={() => setSettingUp(summary)}
            onAddOn={() => setAddingAddOn(summary)}
          />
        ))}
      </div>
      {settingUp ? (
        <InitialSubscriptionDialog
          key={settingUp.clientProductId}
          summary={settingUp}
          clientId={clientId}
          onClose={() => setSettingUp(null)}
        />
      ) : null}
      {renewing ? (
        <RenewalDialog
          key={renewing.clientProductId}
          summary={renewing}
          onClose={() => setRenewing(null)}
        />
      ) : null}
      {configuring ? (
        <ConfigurationDialog
          key={configuring.clientProductId}
          summary={configuring}
          onClose={() => setConfiguring(null)}
        />
      ) : null}
      {addingAddOn ? (
        <SubscriptionAddOnDialog
          key={addingAddOn.clientProductId}
          summary={addingAddOn}
          onClose={() => setAddingAddOn(null)}
        />
      ) : null}
    </>
  );
}

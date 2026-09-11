import {
  DButton,
  DConnectionError,
  DDataTable,
  DDialog,
  DEmptyState,
  DInput,
  DSelect,
  useToast,
  type TableColumn,
} from '@digvation/ui';
import { useState } from 'react';
import { useClientProducts } from '../../client-products/hooks/use-client-products';
import { formatMoney } from '../../commercial-catalog/utils/money';
import {
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
  { key: 'billingCycle', label: 'Billing Cycle' },
  {
    key: 'listAmountMinor',
    label: 'List Price',
    render: (term) => formatMoney(term.listAmountMinor, term.currency),
  },
  {
    key: 'agreedAmountMinor',
    label: 'Agreed Price',
    render: (term) => formatMoney(term.agreedAmountMinor, term.currency),
  },
  {
    key: 'adjustmentType',
    label: 'Adjustment',
    render: (term) => term.adjustmentType.replace('_', ' '),
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
  { key: 'status', label: 'Status' },
  {
    key: 'effectiveFrom',
    label: 'Effective Period',
    render: (item) =>
      `${date(item.effectiveFrom)} → ${date(item.effectiveUntil)}`,
  },
  {
    key: 'agreedAmountMinor',
    label: 'Recurring Agreed',
    render: (item) => formatMoney(item.agreedAmountMinor, item.currency),
  },
  {
    key: 'initialProratedAmountMinor',
    label: 'Initial Prorated',
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
    <DDialog
      open
      onClose={onClose}
      title={`${summary.productName} configuration`}
      description="Operational limits are configuration, not commercial add-ons. Paid premium functionality belongs in the add-on catalog."
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>
            Cancel
          </DButton>
          <DButton onClick={() => void save()} loading={mutation.isPending}>
            Save Changes
          </DButton>
        </div>
      }
    >
      <div className="client-contact-form">
        {configurations.map((configuration, index) =>
          configuration.valueType === 'BOOLEAN' ? (
            <DSelect
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
            <DInput
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
    </DDialog>
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

  async function confirm() {
    if (!reason.trim()) return;
    try {
      await mutation.mutateAsync({
        subscriptionAddOnId: addOn.id,
        targetStatus,
        reason: reason.trim(),
      });
      showToast({ title: 'Add-on lifecycle updated', variant: 'success' });
      onClose();
    } catch (error) {
      showToast({
        title: 'Add-on lifecycle update failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open
      onClose={onClose}
      title={`${targetStatus === 'ACTIVE' ? 'Reactivate' : targetStatus === 'SUSPENDED' ? 'Suspend' : 'Cancel'} ${addOn.addOnName}`}
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>
            Cancel
          </DButton>
          <DButton
            onClick={() => void confirm()}
            loading={mutation.isPending}
            disabled={!reason.trim()}
          >
            Confirm
          </DButton>
        </div>
      }
    >
      <DInput
        label="Reason *"
        value={reason}
        maxLength={500}
        onChange={setReason}
      />
    </DDialog>
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
          {summary.subscription?.status ?? 'NO SUBSCRIPTION'}
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
                <span>List price snapshot</span>
                <strong>
                  {formatMoney(term.listAmountMinor, term.currency)}
                </strong>
                <small>
                  {term.billingCycle.toLowerCase().replace('_', ' ')}
                </small>
              </div>
              <div>
                <span>Agreed Client price</span>
                <strong>
                  {formatMoney(term.agreedAmountMinor, term.currency)}
                </strong>
                <small>
                  {term.adjustmentType === 'NONE'
                    ? 'No adjustment'
                    : `${term.adjustmentType.toLowerCase()} · ${term.adjustmentReason ?? 'reason missing'}`}
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
                <h3>Commercial add-ons</h3>
                <p>
                  Recurring agreed prices are snapshotted per add-on. Initial
                  mid-term activation is co-term prorated.
                </p>
              </div>
              <DButton
                onClick={onAddOn}
                disabled={!subscriptionCanSellAddOns}
                title={
                  subscriptionCanSellAddOns
                    ? undefined
                    : 'An active or trial subscription term must be effective today before adding an add-on.'
                }
              >
                Add Add-on
              </DButton>
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
                          <DButton
                            variant="outline"
                            onClick={() =>
                              setAddOnLifecycle({
                                addOn: item,
                                targetStatus: 'SUSPENDED',
                              })
                            }
                          >
                            Suspend
                          </DButton>
                        ) : (
                          <DButton
                            variant="outline"
                            onClick={() =>
                              setAddOnLifecycle({
                                addOn: item,
                                targetStatus: 'ACTIVE',
                              })
                            }
                          >
                            Reactivate
                          </DButton>
                        )}
                        <DButton
                          variant="outline"
                          onClick={() =>
                            setAddOnLifecycle({
                              addOn: item,
                              targetStatus: 'CANCELLED',
                            })
                          }
                        >
                          Cancel Add-on
                        </DButton>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="client-commercial-empty">
                No commercial add-ons activated.
              </p>
            )}
          </section>

          <section className="client-commercial-section">
            <div className="client-commercial-section-heading">
              <h3>Configuration & limits</h3>
              <DButton variant="outline" onClick={onConfigure}>
                Edit Limits
              </DButton>
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
                No product-specific limits configured.
              </p>
            )}
          </section>

          <section className="client-commercial-section">
            <div className="client-commercial-section-heading">
              <h3>Term history</h3>
              <DButton onClick={onRenew}>Add Renewal</DButton>
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
            The subscription exists but has no commercial term to display.
          </p>
        </section>
      ) : (
        <section className="client-commercial-section">
          <h3>Current subscription</h3>
          <p className="client-commercial-empty">
            No subscription configured. A Product catalog list price is
            required before setup.
          </p>
          <div className="client-commercial-actions">
            <DButton onClick={onSetup}>Set Up Subscription</DButton>
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
        title="Commercial records unavailable"
        message="Subscription records could not be loaded."
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
        title="No commercial products"
        description="Commercial records will appear after a Product is assigned to this Client."
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

import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput } from '../../../shared/ui/form-fields';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { labelFor } from '../../../shared/labels/labels';
import { Pencil, Plus, Tag } from 'lucide-react';
import { AppAction, AppIconAction } from '../../../shared/ui/app-action';
import { DCard, DCardContent, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, useToast, type TableColumn } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import type { ProductDetail } from '../../products/types/product';
import {
  useCreateAddOn,
  useProductAddOns,
  useProductPrices,
  useReplaceAddOnGrants,
  useTransitionAddOn,
  useUpdateAddOn,
  useUpsertAddOnPrice,
  useUpsertProductPrice,
} from '../hooks/use-commercial-catalog';
import type {
  AddOnOffering,
  AddOnOfferingStatus,
  CatalogPrice,
  UpsertCatalogPriceInput,
} from '../types/commercial-catalog';
import { formatMoney } from '../utils/money';
import { AddOnGrantsDialog } from './add-on-grants-dialog';
import { AddOnOfferingDialog } from './add-on-offering-dialog';
import { CatalogPriceDialog } from './catalog-price-dialog';
import '../commercial-catalog.css';

function cycle(value: string) {
  return labelFor(value);
}

const PRICE_COLUMNS: TableColumn<CatalogPrice>[] = [
  {
    key: 'billingCycle',
    label: 'Billing cycle',
    render: (price) => cycle(price.billingCycle),
  },
  { key: 'currency', label: 'Currency' },
  {
    key: 'amountMinor',
    label: 'List price',
    render: (price) => formatMoney(price.amountMinor, price.currency),
  },
];

function OfferingLifecycleDialog({
  offering,
  targetStatus,
  loading,
  onClose,
  onConfirm,
}: {
  offering: AddOnOffering;
  targetStatus: AddOnOfferingStatus;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const { field, allowSubmit } = useFieldErrors<'reason'>('offering-status-reason', () =>
    reason.trim() ? {} : { reason: 'Enter a reason.' },
  );
  return (
    <AppDialog kind="confirm"
      open
      onClose={onClose}
      title={`${targetStatus === 'ACTIVE' ? 'Activate' : targetStatus === 'RETIRED' ? 'Retire' : 'Return to draft'} ${offering.name}`}
      footer={
        <div className="commercial-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </AppAction>
          <AppAction
            onClick={() => {
              if (allowSubmit()) void onConfirm(reason.trim());
            }}
            loading={loading}
          >
            Confirm
          </AppAction>
        </div>
      }
    >
      <div id="offering-status-reason">
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

export function ProductCommercialTab({ detail }: { detail: ProductDetail }) {
  const { product } = detail;
  const pricesQuery = useProductPrices(product.id);
  const addOnsQuery = useProductAddOns(product.id);
  const upsertProductPrice = useUpsertProductPrice(product.id);
  const createAddOn = useCreateAddOn();
  const updateAddOn = useUpdateAddOn();
  const replaceGrants = useReplaceAddOnGrants();
  const upsertAddOnPrice = useUpsertAddOnPrice();
  const transitionAddOn = useTransitionAddOn();
  const { showToast } = useToast();

  const [productPriceOpen, setProductPriceOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<
    AddOnOffering | null | undefined
  >(undefined);
  const [grantOffering, setGrantOffering] = useState<AddOnOffering | null>(null);
  const [priceOffering, setPriceOffering] = useState<AddOnOffering | null>(null);
  const [lifecycle, setLifecycle] = useState<{
    offering: AddOnOffering;
    targetStatus: AddOnOfferingStatus;
  } | null>(null);

  if (pricesQuery.isPending || addOnsQuery.isPending) {
    return <DLoadingIndicator label="Loading commercial catalog" />;
  }
  if (pricesQuery.isError || addOnsQuery.isError) {
    return (
      <DConnectionError
        title="Commercial catalog unavailable"
        message="Product pricing and add-on offerings could not be loaded."
        onRetry={() => {
          void pricesQuery.refetch();
          void addOnsQuery.refetch();
        }}
      />
    );
  }

  const prices = pricesQuery.data ?? [];
  const addOns = addOnsQuery.data ?? [];

  async function saveProductPrice(input: UpsertCatalogPriceInput) {
    try {
      await upsertProductPrice.mutateAsync(input);
      showToast({ title: 'Product list price updated', variant: 'success' });
      setProductPriceOpen(false);
    } catch (error) {
      showToast({
        title: 'Price update failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  async function createOffering(
    input: Parameters<typeof createAddOn.mutateAsync>[0],
  ) {
    try {
      await createAddOn.mutateAsync(input);
      showToast({ title: 'Draft add-on created', variant: 'success' });
      setEditingOffering(undefined);
    } catch (error) {
      showToast({
        title: 'Add-on creation failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  async function updateOffering(
    input: Parameters<typeof updateAddOn.mutateAsync>[0],
  ) {
    try {
      await updateAddOn.mutateAsync(input);
      showToast({ title: 'Add-on updated', variant: 'success' });
      setEditingOffering(undefined);
    } catch (error) {
      showToast({
        title: 'Add-on update failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'danger',
      });
    }
  }

  return (
    <div className="product-commercial-tab">
      <DCard variant="outlined">
        <DCardContent>
          <div className="commercial-section-heading">
            <div>
              <h3>List prices</h3>
              </div>
            <AppAction icon={Tag} tone="secondary"
              disabled={product.status === 'RETIRED'}
              onClick={() => setProductPriceOpen(true)}
            >
              Set price
            </AppAction>
          </div>
          {prices.length ? (
            <DDataTable columns={PRICE_COLUMNS} data={prices} rowKey="id" />
          ) : (
            <DEmptyState
              title="No list price"
              description="Set a price before creating a subscription for that billing cycle."
            />
          )}
        </DCardContent>
      </DCard>

      <DCard variant="outlined">
        <DCardContent>
          <div className="commercial-section-heading">
            <div>
              <h3>Add-ons</h3>
              </div>
            <AppAction icon={Plus} tone="secondary"
              disabled={product.status === 'RETIRED'}
              onClick={() => setEditingOffering(null)}
            >
              Add offering
            </AppAction>
          </div>

          {addOns.length ? (
            <div className="commercial-offering-list">
              {addOns.map((offering) => (
                <article key={offering.id} className="commercial-offering-card">
                  <header>
                    <div>
                      <strong>{offering.name}</strong>
                      <code>{offering.code}</code>
                    </div>
                    <span
                      className={`commercial-status is-${offering.status.toLowerCase()}`}
                    >
                      {offering.status}
                    </span>
                  </header>
                  <p>{valueOrNotSet(offering.description, 'Description')}</p>
                  <dl className="commercial-offering-summary">
                    <div>
                      <dt>Prices</dt>
                      <dd>{offering.prices.length || 'None'}</dd>
                    </div>
                    <div>
                      <dt>Feature grants</dt>
                      <dd>{offering.featureGrants.length || 'None'}</dd>
                    </div>
                    <div>
                      <dt>Capability grants</dt>
                      <dd>{offering.capabilityGrants.length || 'None'}</dd>
                    </div>
                  </dl>
                  {offering.prices.length ? (
                    <div className="commercial-price-chips">
                      {offering.prices.map((price) => (
                        <span key={price.id}>
                          {formatMoney(price.amountMinor, price.currency)} /{' '}
                          {cycle(price.billingCycle)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="commercial-offering-actions">
                    <AppIconAction icon={Pencil} label={`Edit ${offering.name}`}
                      onClick={() => setEditingOffering(offering)} />
                    <AppAction size="sm" tone="secondary"
                      disabled={offering.status !== 'DRAFT'}
                      onClick={() => setGrantOffering(offering)}
                    >
                      Grants
                    </AppAction>
                    <AppAction icon={Tag} tone="secondary"
                      disabled={offering.status === 'RETIRED'}
                      onClick={() => setPriceOffering(offering)}
                    >
                      Set price
                    </AppAction>
                    {offering.status === 'DRAFT' ? (
                      <AppAction size="sm" tone="secondary"
                        disabled={product.status !== 'ACTIVE'}
                        title={
                          product.status === 'ACTIVE'
                            ? undefined
                            : 'Activate the product to sell add-ons.'
                        }
                        onClick={() =>
                          setLifecycle({ offering, targetStatus: 'ACTIVE' })
                        }
                      >
                        Activate
                      </AppAction>
                    ) : null}
                    {offering.status === 'ACTIVE' ? (
                      <AppAction size="sm" tone="secondary"
                        onClick={() =>
                          setLifecycle({ offering, targetStatus: 'DRAFT' })
                        }
                      >
                        Return to draft
                      </AppAction>
                    ) : null}
                    {offering.status !== 'RETIRED' ? (
                      <AppAction size="sm" tone="danger-subtle"
                        onClick={() =>
                          setLifecycle({ offering, targetStatus: 'RETIRED' })
                        }
                      >
                        Retire
                      </AppAction>
                    ) : (
                      <AppAction size="sm" tone="secondary"
                        onClick={() =>
                          setLifecycle({ offering, targetStatus: 'DRAFT' })
                        }
                      >
                        Restore
                      </AppAction>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DEmptyState
              title="No add-ons"
              description="Add an offering to sell a feature or capability separately."
            />
          )}
        </DCardContent>
      </DCard>

      {productPriceOpen ? (
        <CatalogPriceDialog
          key="product-price"
          title={`${product.name} list price`}
          open
          loading={upsertProductPrice.isPending}
          onClose={() => setProductPriceOpen(false)}
          onSubmit={saveProductPrice}
        />
      ) : null}

      {editingOffering !== undefined ? (
        <AddOnOfferingDialog
          key={editingOffering?.id ?? 'new-add-on'}
          productId={product.id}
          offering={editingOffering ?? undefined}
          open
          loading={createAddOn.isPending || updateAddOn.isPending}
          onClose={() => setEditingOffering(undefined)}
          onCreate={createOffering}
          onUpdate={updateOffering}
        />
      ) : null}

      {grantOffering ? (
        <AddOnGrantsDialog
          key={grantOffering.id}
          offering={grantOffering}
          features={detail.features}
          capabilities={detail.capabilities}
          open
          loading={replaceGrants.isPending}
          onClose={() => setGrantOffering(null)}
          onSave={async ({ featureIds, capabilityIds }) => {
            try {
              await replaceGrants.mutateAsync({
                addOnOfferingId: grantOffering.id,
                featureIds,
                capabilityIds,
              });
              showToast({
                title: 'Add-on grants updated',
                variant: 'success',
              });
              setGrantOffering(null);
            } catch (error) {
              showToast({
                title: 'Grant update failed',
                description: error instanceof Error ? error.message : undefined,
                variant: 'danger',
              });
            }
          }}
        />
      ) : null}

      {priceOffering ? (
        <CatalogPriceDialog
          key={`price-${priceOffering.id}`}
          title={`${priceOffering.name} list price`}
          open
          loading={upsertAddOnPrice.isPending}
          onClose={() => setPriceOffering(null)}
          onSubmit={async (input) => {
            try {
              await upsertAddOnPrice.mutateAsync({
                addOnOfferingId: priceOffering.id,
                input,
              });
              showToast({
                title: 'Add-on list price updated',
                variant: 'success',
              });
              setPriceOffering(null);
            } catch (error) {
              showToast({
                title: 'Price update failed',
                description: error instanceof Error ? error.message : undefined,
                variant: 'danger',
              });
            }
          }}
        />
      ) : null}

      {lifecycle ? (
        <OfferingLifecycleDialog
          key={`${lifecycle.offering.id}-${lifecycle.targetStatus}`}
          offering={lifecycle.offering}
          targetStatus={lifecycle.targetStatus}
          loading={transitionAddOn.isPending}
          onClose={() => setLifecycle(null)}
          onConfirm={async (reason) => {
            try {
              await transitionAddOn.mutateAsync({
                addOnOfferingId: lifecycle.offering.id,
                targetStatus: lifecycle.targetStatus,
                reason,
              });
              showToast({
                title: 'Add-on status updated',
                variant: 'success',
              });
              setLifecycle(null);
            } catch (error) {
              showToast({
                title: 'Status update failed',
                description: error instanceof Error ? error.message : undefined,
                variant: 'danger',
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}

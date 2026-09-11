import {
  DButton,
  DCard,
  DCardContent,
  DConnectionError,
  DDataTable,
  DDialog,
  DEmptyState,
  DInput,
  DLoadingIndicator,
  useToast,
  type TableColumn,
} from '@digvation/ui';
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
import { AddOnGrantsDialog } from './add-on-grants-dialog';
import { AddOnOfferingDialog } from './add-on-offering-dialog';
import { CatalogPriceDialog } from './catalog-price-dialog';
import '../commercial-catalog.css';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function cycle(value: string) {
  return value.toLowerCase().replace('_', ' ');
}

const PRICE_COLUMNS: TableColumn<CatalogPrice>[] = [
  { key: 'billingCycle', label: 'Billing Cycle', render: (price) => cycle(price.billingCycle) },
  { key: 'currency', label: 'Currency' },
  { key: 'amountMinor', label: 'List Price', render: (price) => money(price.amountMinor, price.currency) },
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
  return (
    <DDialog
      open
      onClose={onClose}
      title={`${targetStatus === 'ACTIVE' ? 'Activate' : targetStatus === 'RETIRED' ? 'Retire' : 'Return to draft'} ${offering.name}`}
      description="Lifecycle changes affect whether this commercial SKU may be sold. Existing client price snapshots are not rewritten."
      footer={
        <div className="commercial-dialog-actions">
          <DButton variant="outline" onClick={onClose} disabled={loading}>Cancel</DButton>
          <DButton
            onClick={() => reason.trim() && void onConfirm(reason.trim())}
            loading={loading}
          >
            Confirm
          </DButton>
        </div>
      }
    >
      <DInput label="Reason *" value={reason} onChange={setReason} />
    </DDialog>
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
  const [editingOffering, setEditingOffering] = useState<AddOnOffering | null | undefined>(undefined);
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

  async function createOffering(input: Parameters<typeof createAddOn.mutateAsync>[0]) {
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

  async function updateOffering(input: Parameters<typeof updateAddOn.mutateAsync>[0]) {
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
              <h3>Product List Prices</h3>
              <p>Canonical catalog prices. Client-specific deals are captured later as immutable subscription-term snapshots.</p>
            </div>
            <DButton
              variant="outline"
              disabled={product.status === 'RETIRED'}
              onClick={() => setProductPriceOpen(true)}
            >
              Add / Update Price
            </DButton>
          </div>
          {prices.length ? (
            <DDataTable columns={PRICE_COLUMNS} data={prices} rowKey="id" />
          ) : (
            <DEmptyState
              title="No Product list price"
              description="Add a billing-cycle price before creating a client subscription for that cycle."
            />
          )}
        </DCardContent>
      </DCard>

      <DCard variant="outlined">
        <DCardContent>
          <div className="commercial-section-heading">
            <div>
              <h3>Commercial Add-ons</h3>
              <p>A sellable add-on may grant ProductFeatures and/or compatible Capabilities. Technical catalog items themselves remain unpriced.</p>
            </div>
            <DButton
              disabled={product.status === 'RETIRED'}
              onClick={() => setEditingOffering(null)}
            >
              Add Offering
            </DButton>
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
                    <span className={`commercial-status is-${offering.status.toLowerCase()}`}>
                      {offering.status}
                    </span>
                  </header>
                  <p>{offering.description ?? 'No description recorded.'}</p>
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
                          {money(price.amountMinor, price.currency)} / {cycle(price.billingCycle)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="commercial-offering-actions">
                    <DButton variant="outline" onClick={() => setEditingOffering(offering)}>Edit</DButton>
                    <DButton
                      variant="outline"
                      disabled={offering.status !== 'DRAFT'}
                      onClick={() => setGrantOffering(offering)}
                    >
                      Manage Grants
                    </DButton>
                    <DButton
                      variant="outline"
                      disabled={offering.status === 'RETIRED'}
                      onClick={() => setPriceOffering(offering)}
                    >
                      Add / Update Price
                    </DButton>
                    {offering.status === 'DRAFT' ? (
                      <DButton onClick={() => setLifecycle({ offering, targetStatus: 'ACTIVE' })}>Activate</DButton>
                    ) : null}
                    {offering.status === 'ACTIVE' ? (
                      <DButton variant="outline" onClick={() => setLifecycle({ offering, targetStatus: 'DRAFT' })}>Return to Draft</DButton>
                    ) : null}
                    {offering.status !== 'RETIRED' ? (
                      <DButton variant="outline" onClick={() => setLifecycle({ offering, targetStatus: 'RETIRED' })}>Retire</DButton>
                    ) : (
                      <DButton variant="outline" onClick={() => setLifecycle({ offering, targetStatus: 'DRAFT' })}>Restore Draft</DButton>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DEmptyState
              title="No commercial add-ons"
              description="Create a draft offering only when a ProductFeature or Capability should be sold separately from the base Product."
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
              showToast({ title: 'Add-on grants updated', variant: 'success' });
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
              showToast({ title: 'Add-on list price updated', variant: 'success' });
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
              showToast({ title: 'Add-on lifecycle updated', variant: 'success' });
              setLifecycle(null);
            } catch (error) {
              showToast({
                title: 'Lifecycle update failed',
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

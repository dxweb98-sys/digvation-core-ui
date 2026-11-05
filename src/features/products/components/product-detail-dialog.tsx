import { AppAction } from '../../../shared/ui/app-action';
import { DConnectionError, DEmptyState, DLoadingIndicator, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions, DialogSection } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { usePermissions } from '../../auth/use-permissions';
import { ProductClientsTab } from '../../client-products/components/product-clients-tab';
import { ProductCommercialTab } from '../../commercial-catalog/components/product-commercial-tab';
import { useProductDetail } from '../hooks/use-product-detail';
import { useProductStatusTransition } from '../hooks/use-product-mutations';
import type { ProductStatus } from '../types/product';
import { ProductCapabilitiesTab } from './product-capabilities-tab';
import { ProductFeaturesTab } from './product-features-tab';
import { ProductFormDialog } from './product-form-dialog';
import { ProductGrantsSection } from './product-grants-section';
import { ProductLifecycleAction } from './product-lifecycle-action';
import { ProductStatusBadge } from './product-status-badge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ProductDetailDialog({
  productId,
  open,
  onClose,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const productQuery = useProductDetail(productId);
  const statusTransition = useProductStatusTransition();
  const permissions = usePermissions();

  if (productQuery.isPending) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Product details">
        <div className="product-dialog-state">
          <DLoadingIndicator label="Loading product detail" />
        </div>
      </AppDialog>
    );
  }

  // With a loaded record, a failed refetch marks it out of date instead of replacing it.
  if (productQuery.isError && !productQuery.data) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Product unavailable">
        <DConnectionError
          title="Product unavailable"
          message="Product information could not be loaded."
          detail={productQuery.error.message}
          onRetry={() => void productQuery.refetch()}
        />
      </AppDialog>
    );
  }

  if (!productQuery.data) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Product not found">
        <DEmptyState
          title="Product not found"
          description="The requested product record does not exist or is no longer available."
        />
      </AppDialog>
    );
  }

  const detail = productQuery.data;
  const { product } = detail;
  const canUpdate = permissions.can('products.update');
  const canManageLifecycle = permissions.can('products.lifecycle.manage');

  async function handleTransition(targetStatus: ProductStatus, reason: string) {
    await statusTransition.mutateAsync({
      productId: product.id,
      targetStatus,
      reason,
    });
  }

  return (
    <>
      <AppDialog kind="detail"
        open={open}
        onClose={onClose}
        title={product.name}
        status={<ProductStatusBadge status={product.status} />}
        identifier={product.code}
        footer={
          <DialogActions
            destructive={canManageLifecycle ? <ProductLifecycleAction
              product={product}
              isSubmitting={statusTransition.isPending}
              activationBlockedReason={detail.domainCodes.length === 0 ? 'Add a domain first' : undefined}
              onTransition={handleTransition}
            /> : undefined}
            secondary={<AppAction tone="secondary" onClick={onClose}>Close</AppAction>}
            primary={canUpdate ? <AppAction onClick={() => setIsEditDialogOpen(true)}>Edit</AppAction> : undefined}
          />
        }
      >
        <div className="product-detail-dialog">
          {productQuery.isError ? (
            <div className="product-stale" role="status">
              <p>This offering may be out of date. Saved changes were kept, but the latest version could not be loaded.</p>
              <AppAction tone="secondary" size="sm" loading={productQuery.isFetching} onClick={() => void productQuery.refetch()}>Reload</AppAction>
            </div>
          ) : null}
          {statusTransition.isError ? (
            <p className="product-form-error">{statusTransition.error.message}</p>
          ) : null}
          <DTabs
            defaultValue="overview"
            value={tab}
            onValueChange={setTab}
            className="product-detail-tabs"
          >
            <DTabsList>
              <DTabsTrigger value="overview">Overview</DTabsTrigger>
              <DTabsTrigger value="features">Features</DTabsTrigger>
              <DTabsTrigger value="capabilities">Capabilities</DTabsTrigger>
              <DTabsTrigger value="commercial">Commercial</DTabsTrigger>
              <DTabsTrigger value="clients">Clients</DTabsTrigger>
            </DTabsList>
            <DTabsContent value="overview">
              <div><DialogSection title="Product">
                    <DetailList>
                      <DetailItem label="Product name">{product.name}</DetailItem>
                      <DetailItem label="Product code"><code className="product-code">{product.code}</code></DetailItem>
                      <DetailItem label="Status"><ProductStatusBadge status={product.status} /></DetailItem>
                      <DetailItem wide label="Description">{product.description}</DetailItem>
                    </DetailList>
                  </DialogSection>
                  <ProductGrantsSection
                    detail={detail}
                    canEdit={canUpdate}
                    showReadOnlyNote={permissions.resolved}
                  />
                  <DialogSection title="Record">
                    <DetailList>
                      <DetailItem label="Created">{formatDate(product.createdAt)}</DetailItem>
                      <DetailItem label="Updated">{formatDate(product.updatedAt)}</DetailItem>
                    </DetailList>
                  </DialogSection></div>
            </DTabsContent>
            <DTabsContent value="features">
              <ProductFeaturesTab product={product} features={detail.features} />
            </DTabsContent>
            <DTabsContent value="capabilities">
              <ProductCapabilitiesTab
                product={product}
                compatibleCapabilities={detail.capabilities}
                canEdit={canUpdate}
                showReadOnlyNote={permissions.resolved}
              />
            </DTabsContent>
            <DTabsContent value="commercial">
              <ProductCommercialTab detail={detail} />
            </DTabsContent>
            <DTabsContent value="clients">
              <ProductClientsTab productId={product.id} />
            </DTabsContent>
          </DTabs>
        </div>
      </AppDialog>
      <ProductFormDialog
        open={isEditDialogOpen}
        mode="edit"
        product={product}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
}

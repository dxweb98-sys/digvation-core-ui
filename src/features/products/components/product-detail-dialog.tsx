import {
  DButton,
  DCard,
  DCardContent,
  DConnectionError,
  DDialog,
  DEmptyState,
  DLoadingIndicator,
  DTabs,
  DTabsContent,
  DTabsList,
  DTabsTrigger,
} from '@digvation/ui';
import { useState } from 'react';
import { ProductClientsTab } from '../../client-products/components/product-clients-tab';
import { ProductCommercialTab } from '../../commercial-catalog/components/product-commercial-tab';
import { useProductDetail } from '../hooks/use-product-detail';
import { useProductStatusTransition } from '../hooks/use-product-mutations';
import type { ProductStatus } from '../types/product';
import { ProductCapabilitiesTab } from './product-capabilities-tab';
import { ProductFeaturesTab } from './product-features-tab';
import { ProductFormDialog } from './product-form-dialog';
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

  if (productQuery.isPending) {
    return (
      <DDialog open={open} onClose={onClose} title="Product details" size="xl">
        <div className="product-dialog-state">
          <DLoadingIndicator label="Loading product detail" />
        </div>
      </DDialog>
    );
  }

  if (productQuery.isError) {
    return (
      <DDialog open={open} onClose={onClose} title="Product unavailable" size="xl">
        <DConnectionError
          title="Product unavailable"
          message="Product information could not be loaded."
          detail={productQuery.error.message}
          onRetry={() => void productQuery.refetch()}
        />
      </DDialog>
    );
  }

  if (!productQuery.data) {
    return (
      <DDialog open={open} onClose={onClose} title="Product not found" size="xl">
        <DEmptyState
          title="Product not found"
          description="The requested product record does not exist or is no longer available."
        />
      </DDialog>
    );
  }

  const detail = productQuery.data;
  const { product } = detail;

  async function handleTransition(targetStatus: ProductStatus, reason: string) {
    await statusTransition.mutateAsync({
      productId: product.id,
      targetStatus,
      reason,
    });
  }

  return (
    <>
      <DDialog
        open={open}
        onClose={onClose}
        size="xl"
        title={product.name}
        description={<code className="product-code">{product.code}</code>}
        footer={
          <div className="product-dialog-actions">
            <DButton variant="outline" onClick={onClose}>
              Close
            </DButton>
            <DButton
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
            >
              Edit Product
            </DButton>
            <ProductLifecycleAction
              product={product}
              isSubmitting={statusTransition.isPending}
              onTransition={handleTransition}
            />
          </div>
        }
      >
        <div className="product-detail-dialog">
          <div className="product-detail-header">
            <ProductStatusBadge status={product.status} />
          </div>
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
              <DCard variant="outlined">
                <DCardContent>
                  <dl className="product-overview-list">
                    <div>
                      <dt>Product Name</dt>
                      <dd>{product.name}</dd>
                    </div>
                    <div>
                      <dt>Product Code</dt>
                      <dd><code className="product-code">{product.code}</code></dd>
                    </div>
                    <div>
                      <dt>Description</dt>
                      <dd>{product.description ?? 'Not recorded'}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd><ProductStatusBadge status={product.status} /></dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{formatDate(product.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(product.updatedAt)}</dd>
                    </div>
                  </dl>
                </DCardContent>
              </DCard>
            </DTabsContent>
            <DTabsContent value="features">
              <ProductFeaturesTab product={product} features={detail.features} />
            </DTabsContent>
            <DTabsContent value="capabilities">
              <ProductCapabilitiesTab
                product={product}
                compatibleCapabilities={detail.capabilities}
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
      </DDialog>
      <ProductFormDialog
        open={isEditDialogOpen}
        mode="edit"
        product={product}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
}

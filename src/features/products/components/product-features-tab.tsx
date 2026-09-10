import { DButton, DCard, DCardContent, DEmptyState } from '@digvation/ui';
import { useState } from 'react';
import { useProductFeatureStatusTransition } from '../hooks/use-product-mutations';
import type {
  Product,
  ProductFeature,
  ProductFeatureStatus,
} from '../types/product';
import { ProductFeatureFormDialog } from './product-feature-form-dialog';
import { ProductFeatureLifecycleAction } from './product-feature-lifecycle-action';
import { ProductStatusBadge } from './product-status-badge';

export function ProductFeaturesTab({
  product,
  features,
}: {
  product: Product;
  features: ProductFeature[];
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editFeature, setEditFeature] = useState<ProductFeature | null>(null);
  const statusTransition = useProductFeatureStatusTransition();

  async function transitionFeature(
    feature: ProductFeature,
    targetStatus: ProductFeatureStatus,
    reason: string,
  ) {
    await statusTransition.mutateAsync({
      productId: product.id,
      featureId: feature.id,
      targetStatus,
      reason,
    });
  }

  return (
    <>
      <DCard variant="outlined">
        <DCardContent>
          <div className="product-feature-section">
            <div className="product-feature-heading">
              <div>
                <strong>Product-owned features</strong>
                <p>
                  Maintain behavior owned by this Product. Reusable cross-product behavior belongs in the Capability catalog.
                </p>
              </div>
              <DButton
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={product.status === 'RETIRED'}
              >
                Add Feature
              </DButton>
            </div>

            {features.length === 0 ? (
              <DEmptyState
                title="No product features"
                description="This Product does not have feature definitions yet. Add only features whose scope is already accepted for this Product."
              />
            ) : (
              <div className="product-feature-list">
                {features.map((feature) => (
                  <article key={feature.id}>
                    <div className="product-feature-copy">
                      <span className="product-feature-identity">
                        <strong>{feature.name}</strong>
                        <code>{feature.code}</code>
                      </span>
                      {feature.description ? <span>{feature.description}</span> : null}
                    </div>
                    <div className="product-feature-row-actions">
                      <ProductStatusBadge status={feature.status} />
                      <DButton
                        variant="outline"
                        onClick={() => setEditFeature(feature)}
                      >
                        Edit
                      </DButton>
                      <ProductFeatureLifecycleAction
                        product={product}
                        feature={feature}
                        isSubmitting={statusTransition.isPending}
                        onTransition={(targetStatus, reason) =>
                          transitionFeature(feature, targetStatus, reason)
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </DCardContent>
      </DCard>

      <ProductFeatureFormDialog
        open={isCreateDialogOpen}
        mode="create"
        product={product}
        onClose={() => setIsCreateDialogOpen(false)}
      />
      <ProductFeatureFormDialog
        open={editFeature !== null}
        mode="edit"
        product={product}
        feature={editFeature ?? undefined}
        onClose={() => setEditFeature(null)}
      />
    </>
  );
}

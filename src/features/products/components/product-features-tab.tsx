import { Pencil, Plus } from 'lucide-react';
import { AppAction, AppIconAction } from '../../../shared/ui/app-action';
import { DCard, DCardContent, DEmptyState } from '@digvation/ui';
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
                <strong>Features</strong>
                </div>
              <AppAction icon={Plus} tone="secondary"
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={product.status === 'RETIRED'}
              >
                Add feature
              </AppAction>
            </div>

            {features.length === 0 ? (
              <DEmptyState
                title="No product features"
                description="Add a feature to this product."
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
                      <AppIconAction icon={Pencil} label={`Edit ${feature.name}`}
                        onClick={() => setEditFeature(feature)} />
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

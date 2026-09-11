import {
  DButton,
  DCheckbox,
  DDialog,
  DEmptyState,
  DLoadingIndicator,
  useToast,
} from '@digvation/ui';
import { useState } from 'react';

import { ProductStatusBadge } from '../../products/components/product-status-badge';
import { useProductDetail } from '../../products/hooks/use-product-detail';
import type { ProductFeature } from '../../products/types/product';
import { useReplaceClientProductFeatures } from '../hooks/use-client-product-mutations';
import { useClientProductFeatureIds } from '../hooks/use-client-products';
import type { ClientProductSummary } from '../types/client-product';

function FeatureSelectionForm({
  relationship,
  features,
  selectedFeatureIds,
  onClose,
}: {
  relationship: ClientProductSummary;
  features: ProductFeature[];
  selectedFeatureIds: string[];
  onClose: () => void;
}) {
  const replaceFeatures = useReplaceClientProductFeatures();
  const { showToast } = useToast();
  const [selection, setSelection] = useState(
    () =>
      new Set(
        selectedFeatureIds.filter((featureId) =>
          features.some(
            (feature) => feature.id === featureId && feature.status === 'ACTIVE',
          ),
        ),
      ),
  );
  const unavailableAssignedFeatures = features.filter(
    (feature) =>
      selectedFeatureIds.includes(feature.id) && feature.status !== 'ACTIVE',
  );

  function toggleFeature(featureId: string, checked: boolean) {
    setSelection((current) => {
      const next = new Set(current);
      if (checked) next.add(featureId);
      else next.delete(featureId);
      return next;
    });
  }

  async function save() {
    try {
      await replaceFeatures.mutateAsync({
        clientProductId: relationship.id,
        featureIds: [...selection],
      });
      showToast({
        title: 'Product features updated',
        description: `${relationship.productName} now uses the selected feature entitlement set.`,
        variant: 'success',
      });
      onClose();
    } catch (error) {
      showToast({
        title: 'Feature update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Product feature entitlements could not be saved.',
        variant: 'danger',
      });
    }
  }

  if (features.length === 0) {
    return (
      <DEmptyState
        title="No product features"
        description="This product does not currently define any feature catalog entries."
      />
    );
  }

  return (
    <div className="client-feature-composition">
      <div className="client-composition-copy">
        <strong>Explicit feature entitlement</strong>
        <p>
          Select the active features this client may use for {relationship.productName}.
          Product ownership alone does not imply every catalog feature is enabled.
        </p>
      </div>

      {unavailableAssignedFeatures.length > 0 ? (
        <p className="client-composition-warning">
          {unavailableAssignedFeatures.length} previously selected feature
          {unavailableAssignedFeatures.length === 1 ? ' is' : 's are'} no longer active.
          Saving this composition will remove those inactive selections.
        </p>
      ) : null}

      <div className="client-feature-list">
        {features.map((feature) => (
          <label key={feature.id} className="client-feature-row">
            <DCheckbox
              checked={selection.has(feature.id)}
              disabled={feature.status !== 'ACTIVE' || replaceFeatures.isPending}
              aria-label={`Enable ${feature.name}`}
              onChange={(event) => toggleFeature(feature.id, event.target.checked)}
            />
            <span className="client-feature-copy">
              <span className="client-feature-identity">
                <strong>{feature.name}</strong>
                <code>{feature.code}</code>
              </span>
              {feature.description ? <span>{feature.description}</span> : null}
            </span>
            <ProductStatusBadge status={feature.status} />
          </label>
        ))}
      </div>

      <div className="client-product-dialog-actions">
        <DButton
          variant="outline"
          onClick={onClose}
          disabled={replaceFeatures.isPending}
        >
          Cancel
        </DButton>
        <DButton onClick={() => void save()} loading={replaceFeatures.isPending}>
          Save Features
        </DButton>
      </div>
    </div>
  );
}

export function ClientProductFeaturesDialog({
  relationship,
  open,
  onClose,
}: {
  relationship: ClientProductSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const productDetail = useProductDetail(relationship?.productId ?? '');
  const featureEntitlements = useClientProductFeatureIds(relationship?.id ?? '');

  const isPending = productDetail.isPending || featureEntitlements.isPending;
  const error = productDetail.error ?? featureEntitlements.error;

  return (
    <DDialog
      open={open}
      onClose={onClose}
      title={relationship ? `Configure ${relationship.productName}` : 'Configure product'}
      description="Manage this client product's explicit feature entitlement set."
      size="lg"
    >
      {!relationship ? null : isPending ? (
        <div className="client-product-dialog-state">
          <DLoadingIndicator label="Loading product composition" />
        </div>
      ) : error ? (
        <DEmptyState
          title="Product composition unavailable"
          description={
            error instanceof Error
              ? error.message
              : 'Product composition could not be loaded.'
          }
          action={
            <DButton
              variant="outline"
              onClick={() => {
                void productDetail.refetch();
                void featureEntitlements.refetch();
              }}
            >
              Retry
            </DButton>
          }
        />
      ) : !productDetail.data ? (
        <DEmptyState
          title="Product unavailable"
          description="The assigned product catalog entry could not be found."
        />
      ) : (
        <FeatureSelectionForm
          key={`${relationship.id}:${featureEntitlements.data?.join(',') ?? ''}`}
          relationship={relationship}
          features={productDetail.data.features}
          selectedFeatureIds={featureEntitlements.data ?? []}
          onClose={onClose}
        />
      )}
    </DDialog>
  );
}

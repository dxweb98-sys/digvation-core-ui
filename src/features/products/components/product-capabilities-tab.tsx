import {
  DButton,
  DCard,
  DCardContent,
  DCheckbox,
  DEmptyState,
  DLoadingIndicator,
  useToast,
} from '@digvation/ui';
import { useState } from 'react';

import { useCapabilityCatalog } from '../hooks/use-capability-catalog';
import { useReplaceProductCapabilities } from '../hooks/use-product-mutations';
import type { Capability, Product } from '../types/product';
import { ProductStatusBadge } from './product-status-badge';

function CapabilityList({
  capabilities,
  isEditing,
  selectedCapabilityIds,
  onToggle,
}: {
  capabilities: Capability[];
  isEditing: boolean;
  selectedCapabilityIds: Set<string>;
  onToggle: (capabilityId: string, checked: boolean) => void;
}) {
  if (capabilities.length === 0) {
    return (
      <DEmptyState
        title="No compatible capabilities"
        description="This product does not currently declare any reusable capability compatibility."
      />
    );
  }

  return (
    <div className="product-capability-list">
      {capabilities.map((capability) => (
        <label key={capability.id} className="product-capability-row">
          {isEditing ? (
            <DCheckbox
              checked={selectedCapabilityIds.has(capability.id)}
              disabled={capability.status === 'RETIRED'}
              aria-label={`Allow ${capability.name}`}
              onChange={(event) => onToggle(capability.id, event.target.checked)}
            />
          ) : null}
          <span className="product-capability-copy">
            <span className="product-capability-identity">
              <strong>{capability.name}</strong>
              <code className="product-code">{capability.code}</code>
            </span>
            {capability.description ? <span>{capability.description}</span> : null}
          </span>
          <ProductStatusBadge status={capability.status} />
        </label>
      ))}
    </div>
  );
}

export function ProductCapabilitiesTab({
  product,
  compatibleCapabilities,
}: {
  product: Product;
  compatibleCapabilities: Capability[];
}) {
  const capabilityCatalog = useCapabilityCatalog();
  const replaceCapabilities = useReplaceProductCapabilities();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<Set<string>>(
    new Set(),
  );

  const displayCapabilities = isEditing
    ? capabilityCatalog.data ?? []
    : compatibleCapabilities;

  function snapshotCurrentCompatibility() {
    setSelectedCapabilityIds(
      new Set(compatibleCapabilities.map((capability) => capability.id)),
    );
  }

  function beginEditing() {
    snapshotCurrentCompatibility();
    setIsEditing(true);
  }

  function cancelEditing() {
    snapshotCurrentCompatibility();
    setIsEditing(false);
  }

  function toggleCapability(capabilityId: string, checked: boolean) {
    setSelectedCapabilityIds((current) => {
      const next = new Set(current);
      if (checked) next.add(capabilityId);
      else next.delete(capabilityId);
      return next;
    });
  }

  async function saveCompatibility() {
    try {
      await replaceCapabilities.mutateAsync({
        productId: product.id,
        capabilityIds: [...selectedCapabilityIds],
      });
      setIsEditing(false);
      showToast({
        title: 'Capability compatibility updated',
        description: `${product.name} now uses the selected capability catalog mapping.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Capability update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Capability compatibility could not be saved.',
        variant: 'danger',
      });
    }
  }

  return (
    <DCard variant="outlined">
      <DCardContent>
        <div className="product-capability-section">
          <div className="product-capability-heading">
            <div>
              <strong>Compatible capabilities</strong>
              <p>
                Define which reusable capabilities this product can support. Client entitlement is granted separately and does not come from this mapping alone.
              </p>
            </div>
            {isEditing ? (
              <div className="product-capability-actions">
                <DButton
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={replaceCapabilities.isPending}
                >
                  Cancel
                </DButton>
                <DButton
                  onClick={() => void saveCompatibility()}
                  loading={replaceCapabilities.isPending}
                >
                  Save Compatibility
                </DButton>
              </div>
            ) : (
              <DButton
                variant="outline"
                onClick={beginEditing}
                disabled={product.status === 'RETIRED'}
              >
                Manage Capabilities
              </DButton>
            )}
          </div>

          {product.status === 'RETIRED' ? (
            <p className="product-capability-note">
              Retired products keep their historical compatibility mapping, but it can no longer be changed.
            </p>
          ) : null}

          {isEditing && capabilityCatalog.isPending ? (
            <div className="product-capability-state">
              <DLoadingIndicator label="Loading capability catalog" />
            </div>
          ) : isEditing && capabilityCatalog.isError ? (
            <div className="product-capability-state">
              <DEmptyState
                title="Capability catalog unavailable"
                description="The reusable capability catalog could not be loaded."
              />
            </div>
          ) : (
            <CapabilityList
              capabilities={displayCapabilities}
              isEditing={isEditing}
              selectedCapabilityIds={selectedCapabilityIds}
              onToggle={toggleCapability}
            />
          )}
        </div>
      </DCardContent>
    </DCard>
  );
}

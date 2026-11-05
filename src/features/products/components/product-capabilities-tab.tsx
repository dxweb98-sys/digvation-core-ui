import { Pencil } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DCard, DCardContent, DCheckbox, DEmptyState, DLoadingIndicator, useToast } from '@digvation/ui';
import { useState } from 'react';

import { CapabilityStatusBadge } from '../../capabilities/components/capability-status-badge';
import type {
  Capability,
  CapabilitySummary,
} from '../../capabilities/types/capability';
import { useCapabilityCatalog } from '../hooks/use-capability-catalog';
import { useReplaceProductCapabilities } from '../hooks/use-product-mutations';
import type { Product } from '../types/product';

function CapabilityList({
  capabilities,
  isEditing,
  selectedCapabilityIds,
  onToggle,
}: {
  capabilities: Array<Capability | CapabilitySummary>;
  isEditing: boolean;
  selectedCapabilityIds: Set<string>;
  onToggle: (capabilityId: string, checked: boolean) => void;
}) {
  if (capabilities.length === 0) {
    return (
      <DEmptyState
        title="No capabilities"
        description="Edit to add the capabilities this product supports."
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
          <CapabilityStatusBadge status={capability.status} />
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
  compatibleCapabilities: CapabilitySummary[];
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
              </div>
            {isEditing ? (
              <div className="product-capability-actions">
                <AppAction
                  tone="secondary"
                  onClick={cancelEditing}
                  disabled={replaceCapabilities.isPending}
                >
                  Cancel
                </AppAction>
                <AppAction
                  onClick={() => void saveCompatibility()}
                  loading={replaceCapabilities.isPending}
                  disabled={
                    capabilityCatalog.isPending || capabilityCatalog.isError
                  }
                >
                  Save
                </AppAction>
              </div>
            ) : (
              <AppAction icon={Pencil} tone="secondary"
                onClick={beginEditing}
                disabled={product.status === 'RETIRED'}
              >
                Edit
              </AppAction>
            )}
          </div>

          {product.status === 'RETIRED' ? (
            <p className="product-capability-note">
              Retired products cannot be edited.
            </p>
          ) : null}

          {isEditing && capabilityCatalog.isPending ? (
            <div className="product-capability-state">
              <DLoadingIndicator label="Loading capability catalog" />
            </div>
          ) : isEditing && capabilityCatalog.isError ? (
            <div className="product-capability-state">
              <DEmptyState
                title="Capabilities unavailable"
                description="Capabilities could not be loaded."
                action={
                  <AppAction
                    tone="secondary"
                    onClick={() => void capabilityCatalog.refetch()}
                  >
                    Retry
                  </AppAction>
                }
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

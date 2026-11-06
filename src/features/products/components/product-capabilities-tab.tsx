import { Pencil } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DBadge, DCard, DCardContent, DCheckbox, DEmptyState, DLoadingIndicator, DRadio, useToast } from '@digvation/ui';
import { useState } from 'react';

import { CapabilityStatusBadge } from '../../capabilities/components/capability-status-badge';
import type { Capability } from '../../capabilities/types/capability';
import { labelFor } from '../../../shared/labels/labels';
import { useCapabilityCatalog } from '../hooks/use-capability-catalog';
import { useReplaceProductCapabilities } from '../hooks/use-product-mutations';
import type { Product, ProductCapability } from '../types/product';

const INCLUSION_NOTE =
  'Included is granted with the offering. Compatible can be granted separately or through an add-on.';
const RETIRED_NOTE = 'Retired capabilities cannot be Included.';

function InclusionControl({
  capability,
  included,
  onChange,
}: {
  capability: Capability | ProductCapability;
  included: boolean;
  onChange: (included: boolean) => void;
}) {
  const includedBlocked = capability.status === 'RETIRED' && !included;
  return (
    <span className="product-inclusion">
      <span
        className="product-inclusion-control"
        role="radiogroup"
        aria-label={`How ${capability.name} is granted`}
      >
        <label>
          <DRadio
            name={`inclusion-${capability.id}`}
            checked={included}
            disabled={includedBlocked}
            onChange={() => onChange(true)}
          />
          {labelFor('INCLUDED')}
        </label>
        <label>
          <DRadio
            name={`inclusion-${capability.id}`}
            checked={!included}
            onChange={() => onChange(false)}
          />
          {labelFor('COMPATIBLE')}
        </label>
      </span>
      {includedBlocked ? (
        <span className="product-grant-note">{RETIRED_NOTE}</span>
      ) : null}
    </span>
  );
}

function CapabilityList({
  capabilities,
  isEditing,
  selectedCapabilityIds,
  includedCapabilityIds,
  onToggle,
  onInclusionChange,
}: {
  capabilities: Array<Capability | ProductCapability>;
  isEditing: boolean;
  selectedCapabilityIds: Set<string>;
  includedCapabilityIds: Set<string>;
  onToggle: (capabilityId: string, checked: boolean) => void;
  onInclusionChange: (capabilityId: string, included: boolean) => void;
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
        <div key={capability.id} className="product-capability-row">
          <label className="product-capability-pick">
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
          </label>
          {isEditing && selectedCapabilityIds.has(capability.id) ? (
            <InclusionControl
              capability={capability}
              included={includedCapabilityIds.has(capability.id)}
              onChange={(included) => onInclusionChange(capability.id, included)}
            />
          ) : null}
          {!isEditing && 'inclusion' in capability ? (
            <DBadge variant={capability.inclusion === 'INCLUDED' ? 'primary' : 'secondary'}>
              {labelFor(capability.inclusion)}
            </DBadge>
          ) : null}
          <CapabilityStatusBadge status={capability.status} />
        </div>
      ))}
    </div>
  );
}

export function ProductCapabilitiesTab({
  product,
  compatibleCapabilities,
  canEdit,
  showReadOnlyNote,
}: {
  product: Product;
  compatibleCapabilities: ProductCapability[];
  canEdit: boolean;
  showReadOnlyNote: boolean;
}) {
  const capabilityCatalog = useCapabilityCatalog();
  const replaceCapabilities = useReplaceProductCapabilities();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<Set<string>>(
    new Set(),
  );
  const [includedCapabilityIds, setIncludedCapabilityIds] = useState<Set<string>>(
    new Set(),
  );

  const displayCapabilities = isEditing
    ? capabilityCatalog.data ?? []
    : compatibleCapabilities;

  function snapshotCurrentCompatibility() {
    setSelectedCapabilityIds(
      new Set(compatibleCapabilities.map((capability) => capability.id)),
    );
    setIncludedCapabilityIds(
      new Set(
        compatibleCapabilities
          .filter((capability) => capability.inclusion === 'INCLUDED')
          .map((capability) => capability.id),
      ),
    );
    setSubmitError(null);
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
    if (!checked) changeInclusion(capabilityId, false);
  }

  function changeInclusion(capabilityId: string, included: boolean) {
    setIncludedCapabilityIds((current) => {
      const next = new Set(current);
      if (included) next.add(capabilityId);
      else next.delete(capabilityId);
      return next;
    });
  }

  async function saveCompatibility() {
    setSubmitError(null);
    try {
      await replaceCapabilities.mutateAsync({
        productId: product.id,
        capabilityIds: [...selectedCapabilityIds],
        includedCapabilityIds: [...includedCapabilityIds],
      });
      setIsEditing(false);
      showToast({
        title: 'Capability compatibility updated',
        description: `${product.name} now uses the selected capability catalog mapping.`,
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Capability compatibility could not be saved.';
      setSubmitError(message);
      showToast({
        title: 'Capability update failed',
        description: message,
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
              <strong>Capabilities</strong>
              <p>{INCLUSION_NOTE}</p>
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
            ) : canEdit ? (
              <AppAction icon={Pencil} tone="secondary"
                onClick={beginEditing}
                disabled={product.status === 'RETIRED'}
              >
                Edit
              </AppAction>
            ) : null}
          </div>

          {product.status === 'RETIRED' ? (
            <p className="product-capability-note">
              Retired products cannot be edited.
            </p>
          ) : !canEdit && showReadOnlyNote ? (
            <p className="product-capability-note">
              Changing this needs the Update permission under Products.
            </p>
          ) : null}

          {submitError ? (
            <p className="product-form-error" role="alert">{submitError}</p>
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
              includedCapabilityIds={includedCapabilityIds}
              onToggle={toggleCapability}
              onInclusionChange={changeInclusion}
            />
          )}
        </div>
      </DCardContent>
    </DCard>
  );
}

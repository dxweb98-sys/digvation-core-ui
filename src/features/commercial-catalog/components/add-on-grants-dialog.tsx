import { DButton, DCheckbox, DDialog } from '@digvation/ui';
import { useState } from 'react';
import type { CapabilitySummary } from '../../capabilities/types/capability';
import type { ProductFeature } from '../../products/types/product';
import type { AddOnOffering } from '../types/commercial-catalog';

export function AddOnGrantsDialog({
  offering,
  features,
  capabilities,
  open,
  loading,
  onClose,
  onSave,
}: {
  offering: AddOnOffering;
  features: ProductFeature[];
  capabilities: CapabilitySummary[];
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: (input: { featureIds: string[]; capabilityIds: string[] }) => Promise<void>;
}) {
  const [featureIds, setFeatureIds] = useState(
    () => new Set(offering.featureGrants.map((grant) => grant.productFeatureId)),
  );
  const [capabilityIds, setCapabilityIds] = useState(
    () => new Set(offering.capabilityGrants.map((grant) => grant.capabilityId)),
  );

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, checked: boolean) {
    setter((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <DDialog
      open={open}
      onClose={onClose}
      title={`Entitlement grants · ${offering.name}`}
      description="Choose the technical contracts unlocked by purchasing this commercial add-on. Grants are editable only while the offering is draft."
      size="lg"
      footer={
        <div className="commercial-dialog-actions">
          <DButton variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </DButton>
          <DButton
            onClick={() =>
              void onSave({
                featureIds: [...featureIds],
                capabilityIds: [...capabilityIds],
              })
            }
            loading={loading}
          >
            Save Grants
          </DButton>
        </div>
      }
    >
      <div className="commercial-grants-grid">
        <section>
          <h3>Product Features</h3>
          <p>Premium or packaged ProductFeature contracts for this Product.</p>
          <div className="commercial-grant-list">
            {features.map((feature) => (
              <label key={feature.id} className="commercial-grant-row">
                <DCheckbox
                  checked={featureIds.has(feature.id)}
                  disabled={feature.status === 'RETIRED'}
                  onChange={(event) =>
                    toggle(setFeatureIds, feature.id, event.target.checked)
                  }
                />
                <span>
                  <strong>{feature.name}</strong>
                  <code>{feature.code}</code>
                </span>
                <small>{feature.status}</small>
              </label>
            ))}
            {!features.length ? <p>No ProductFeatures defined.</p> : null}
          </div>
        </section>
        <section>
          <h3>Capabilities</h3>
          <p>Reusable capabilities must already be compatible with this Product.</p>
          <div className="commercial-grant-list">
            {capabilities.map((capability) => (
              <label key={capability.id} className="commercial-grant-row">
                <DCheckbox
                  checked={capabilityIds.has(capability.id)}
                  disabled={capability.status === 'RETIRED'}
                  onChange={(event) =>
                    toggle(setCapabilityIds, capability.id, event.target.checked)
                  }
                />
                <span>
                  <strong>{capability.name}</strong>
                  <code>{capability.code}</code>
                </span>
                <small>{capability.status}</small>
              </label>
            ))}
            {!capabilities.length ? <p>No compatible Capabilities defined.</p> : null}
          </div>
        </section>
      </div>
    </DDialog>
  );
}

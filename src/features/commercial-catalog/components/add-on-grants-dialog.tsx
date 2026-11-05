import { AppAction } from '../../../shared/ui/app-action';
import { DCheckbox } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
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
    <AppDialog kind="wide"
      open={open}
      onClose={onClose}
      title={`Grants for ${offering.name}`}
      footer={
        <div className="commercial-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </AppAction>
          <AppAction
            onClick={() =>
              void onSave({
                featureIds: [...featureIds],
                capabilityIds: [...capabilityIds],
              })
            }
            loading={loading}
          >
            Save
          </AppAction>
        </div>
      }
    >
      <div className="commercial-grants-grid">
        <section>
          <h3>Features</h3>
          <p>Features of this product.</p>
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
            {!features.length ? <p>No features yet.</p> : null}
          </div>
        </section>
        <section>
          <h3>Capabilities</h3>
          <p>Only capabilities this product supports are listed.</p>
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
            {!capabilities.length ? <p>No compatible capabilities yet.</p> : null}
          </div>
        </section>
      </div>
    </AppDialog>
  );
}

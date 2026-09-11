import { DButton, DDialog, DInput } from '@digvation/ui';
import { useState } from 'react';
import type { AddOnOffering } from '../types/commercial-catalog';

export function AddOnOfferingDialog({
  productId,
  offering,
  open,
  loading,
  onClose,
  onCreate,
  onUpdate,
}: {
  productId: string;
  offering?: AddOnOffering;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (input: {
    productId: string;
    code: string;
    name: string;
    description?: string;
  }) => Promise<void>;
  onUpdate: (input: {
    addOnOfferingId: string;
    name: string;
    description?: string;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState(offering?.code ?? '');
  const [name, setName] = useState(offering?.name ?? '');
  const [description, setDescription] = useState(offering?.description ?? '');

  return (
    <DDialog
      open={open}
      onClose={onClose}
      title={offering ? 'Edit add-on offering' : 'Create add-on offering'}
      description="An add-on is a sellable commercial SKU. It grants technical ProductFeatures and/or reusable Capabilities without pricing those technical contracts directly."
      footer={
        <div className="commercial-dialog-actions">
          <DButton variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </DButton>
          <DButton form="add-on-offering-form" type="submit" loading={loading}>
            {offering ? 'Save Changes' : 'Create Draft'}
          </DButton>
        </div>
      }
    >
      <form
        id="add-on-offering-form"
        className="commercial-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || (!offering && !code.trim())) return;
          if (offering) {
            void onUpdate({
              addOnOfferingId: offering.id,
              name: name.trim(),
              description: description.trim() || undefined,
            });
            return;
          }
          void onCreate({
            productId,
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description: description.trim() || undefined,
          });
        }}
      >
        <DInput
          label="Code *"
          value={code}
          disabled={Boolean(offering)}
          hint="Stable machine-readable commercial SKU code."
          onChange={(value) => setCode(value.toUpperCase())}
        />
        <DInput label="Name *" value={name} onChange={setName} />
        <DInput
          label="Description"
          value={description}
          onChange={setDescription}
        />
      </form>
    </DDialog>
  );
}

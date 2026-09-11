import { DButton, DDialog, DInput } from '@digvation/ui';
import { useState } from 'react';
import type { AddOnOffering } from '../types/commercial-catalog';

const ADD_ON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]+$/;

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
  const normalizedCode = code.trim().toUpperCase();
  const normalizedName = name.trim();
  const validCode =
    Boolean(offering) ||
    (ADD_ON_CODE_PATTERN.test(normalizedCode) && normalizedCode.length <= 80);
  const canSubmit =
    validCode &&
    Boolean(normalizedName) &&
    normalizedName.length <= 150 &&
    description.length <= 500;

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
          <DButton
            form="add-on-offering-form"
            type="submit"
            loading={loading}
            disabled={!canSubmit}
          >
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
          if (!canSubmit) return;
          if (offering) {
            void onUpdate({
              addOnOfferingId: offering.id,
              name: normalizedName,
              description: description.trim(),
            });
            return;
          }
          void onCreate({
            productId,
            code: normalizedCode,
            name: normalizedName,
            description: description.trim() || undefined,
          });
        }}
      >
        <DInput
          label="Code *"
          value={code}
          disabled={Boolean(offering)}
          maxLength={80}
          hint="Stable machine-readable commercial SKU code."
          error={
            !offering && code && !validCode
              ? 'Use at least two letters/numbers; hyphen and underscore are allowed after the first character.'
              : undefined
          }
          onChange={(value) => setCode(value.toUpperCase())}
        />
        <DInput
          label="Name *"
          value={name}
          maxLength={150}
          onChange={setName}
        />
        <DInput
          label="Description"
          value={description}
          maxLength={500}
          onChange={setDescription}
        />
      </form>
    </DDialog>
  );
}

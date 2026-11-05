import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';

import { AppDialog } from '../../../shared/ui/app-dialog';
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
  const { field, allowSubmit } = useFieldErrors<'code' | 'name' | 'description'>(
    'add-on-offering-form',
    () => ({
      ...(validCode
        ? {}
        : {
            code: 'At least two characters. Start with a letter or number; hyphens and underscores can follow.',
          }),
      ...(normalizedName ? {} : { name: 'Enter a name.' }),
      ...(normalizedName.length <= 150 ? {} : { name: 'Use 150 characters or fewer.' }),
      ...(description.length <= 500 ? {} : { description: 'Use 500 characters or fewer.' }),
    }),
  );

  return (
    <AppDialog kind="form"
      open={open}
      onClose={onClose}
      title={offering ? 'Edit add-on offering' : 'Create add-on offering'}
      footer={
        <div className="commercial-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </AppAction>
          <AppAction
            form="add-on-offering-form"
            type="submit"
            loading={loading}
          >
            {offering ? 'Save' : 'Create draft'}
          </AppAction>
        </div>
      }
    >
      <form
        id="add-on-offering-form"
        className="commercial-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!allowSubmit()) return;
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
        <AppInput
          {...field('code')}
          label="Code" placeholder="EXTRA-SEATS"
          value={code}
          disabled={Boolean(offering)}
          maxLength={80}
          hint="Cannot be changed later."
          onChange={(value) => setCode(value.toUpperCase())}
        />
        <AppInput
          {...field('name')}
          label="Name" placeholder="Extra seats"
          value={name}
          maxLength={150}
          onChange={setName}
        />
        <AppInput
          {...field('description')}
          label="Description" placeholder="Ten extra operator seats" optional
          value={description}
          maxLength={500}
          onChange={setDescription}
        />
      </form>
    </AppDialog>
  );
}

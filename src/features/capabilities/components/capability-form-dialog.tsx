import { AppAction } from '../../../shared/ui/app-action';
import { useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { CapabilityForm } from './capability-form';
import {
  useCreateCapability,
  useUpdateCapability,
} from '../hooks/use-capability-mutations';
import type { Capability } from '../types/capability';
import type { CapabilityFormValues } from '../schemas/capability-form-schema';

const CAPABILITY_FORM_ID = 'capability-form';

export function CapabilityFormDialog({
  open,
  mode,
  capability,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  capability?: Capability;
  onClose: () => void;
}) {
  const createCapability = useCreateCapability();
  const updateCapability = useUpdateCapability(capability?.id ?? '');
  const { showToast } = useToast();
  const isEditing = mode === 'edit';
  const isSubmitting = createCapability.isPending || updateCapability.isPending;

  function closeDialog() {
    if (!isSubmitting) onClose();
  }

  async function submitCapability(values: CapabilityFormValues) {
    try {
      if (isEditing) {
        await updateCapability.mutateAsync({
          name: values.name,
          description: values.description,
        });
        showToast({
          title: 'Capability updated',
          description: `${values.name} was updated.`,
          variant: 'success',
        });
      } else {
        await createCapability.mutateAsync(values);
        showToast({
          title: 'Capability created',
          description: `${values.name} was added.`,
          variant: 'success',
        });
      }
      onClose();
    } catch (error) {
      showToast({
        title: isEditing ? 'Capability update failed' : 'Capability creation failed',
        description:
          error instanceof Error
            ? error.message
            : 'The capability record could not be saved.',
        variant: 'danger',
      });
      throw error;
    }
  }

  return (
    <AppDialog kind="form"
      open={open}
      onClose={closeDialog}
      title={
        isEditing
          ? `Edit ${capability?.name ?? 'capability'}`
          : 'Add capability'
      }
      footer={
        <div className="capability-dialog-actions">
          <AppAction
            tone="secondary"
            onClick={closeDialog}
            disabled={isSubmitting}
          >
            Cancel
          </AppAction>
          <AppAction
            form={CAPABILITY_FORM_ID}
            type="submit"
            loading={isSubmitting}
          >
            {isEditing ? 'Save' : 'Create capability'}
          </AppAction>
        </div>
      }
    >
      <CapabilityForm
        formId={CAPABILITY_FORM_ID}
        mode={mode}
        defaultValues={
          isEditing && capability
            ? {
                code: capability.code,
                name: capability.name,
                description: capability.description ?? '',
              }
            : { code: '', name: '', description: '' }
        }
        onSubmit={submitCapability}
      />
    </AppDialog>
  );
}

import { DDialog, useToast } from '@digvation/ui';
import { ClientForm } from './client-form';
import { useCreateClient, useUpdateClient } from '../hooks/use-client-mutations';
import type { ClientFormValues } from '../schemas/client-form-schema';
import type { Client } from '../types/client';

export function ClientFormDialog({
  open,
  mode,
  client,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  client?: Client;
  onClose: () => void;
}) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id ?? '');
  const { showToast } = useToast();
  const isEditing = mode === 'edit';
  const isSubmitting = createClient.isPending || updateClient.isPending;

  function closeDialog() {
    if (!isSubmitting) {
      onClose();
    }
  }

  async function submitClient(values: ClientFormValues) {
    try {
      if (isEditing) {
        await updateClient.mutateAsync({ displayName: values.displayName, legalName: values.legalName, organizationEmail: values.organizationEmail || undefined, organizationPhone: values.organizationPhone || undefined, website: values.website || undefined, taxIdentifier: values.taxIdentifier || undefined, country: values.country || undefined, timezone: values.timezone || undefined, address: values.address || undefined, notes: values.notes || undefined });
        showToast({ title: 'Client updated', description: `${values.displayName} was updated.`, variant: 'success' });
      } else {
        await createClient.mutateAsync(values);
        showToast({ title: 'Client created', description: `${values.displayName} was added to the control plane.`, variant: 'success' });
      }
      onClose();
    } catch (error) {
      showToast({
        title: isEditing ? 'Client update failed' : 'Client creation failed',
        description: error instanceof Error ? error.message : 'The client record could not be saved.',
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open={open}
      onClose={closeDialog}
      title={isEditing ? `Edit ${client?.displayName ?? 'client'}` : 'Add client'}
      description={isEditing ? 'Update client information. The stable client code cannot be changed.' : 'Create a control-plane client record. The client code becomes immutable once created.'}
    >
      <ClientForm
        mode={mode}
        defaultValues={isEditing && client ? { code: client.code, displayName: client.displayName, legalName: client.legalName ?? '', organizationEmail: client.organizationEmail ?? '', organizationPhone: client.organizationPhone ?? '', website: client.website ?? '', taxIdentifier: client.taxIdentifier ?? '', country: client.country ?? '', timezone: client.timezone ?? '', address: client.address ?? '', notes: client.notes ?? '' } : { code: '', displayName: '', legalName: '', organizationEmail: '', organizationPhone: '', website: '', taxIdentifier: '', country: '', timezone: '', address: '', notes: '' }}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Save Changes' : 'Create Client'}
        onCancel={closeDialog}
        onSubmit={submitClient}
      />
    </DDialog>
  );
}

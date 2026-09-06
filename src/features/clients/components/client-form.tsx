import { DButton, DInput } from '@digvation-labs/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { clientFormSchema, normalizeClientCode, type ClientFormValues } from '../schemas/client-form-schema';

export type ClientFormMode = 'create' | 'edit';

export function ClientForm({
  mode,
  defaultValues,
  isSubmitting,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  mode: ClientFormMode;
  defaultValues: ClientFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ClientFormValues) => void | Promise<void>;
}) {
  const form = useForm<ClientFormValues>({ defaultValues });
  const { code, displayName, legalName } = defaultValues;

  useEffect(() => {
    form.reset({ code, displayName, legalName });
  }, [code, displayName, form, legalName]);

  async function handleSubmit(values: ClientFormValues) {
    const normalizedValues = {
      ...values,
      code: normalizeClientCode(values.code),
      legalName: values.legalName?.trim() || undefined,
    };
    const result = clientFormSchema.safeParse(normalizedValues);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof ClientFormValues;
        form.setError(fieldName, { message: issue.message });
      }
      return;
    }

    await onSubmit(result.data);
  }

  return (
    <form className="client-form" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <DInput
        label="Client Code *"
        hint={mode === 'create' ? 'Stable machine-readable identifier. Uppercase letters, numbers, and hyphens only.' : 'Client code is immutable after creation.'}
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        error={form.formState.errors.code?.message}
        onChange={(value) => form.setValue('code', normalizeClientCode(value), { shouldValidate: true })}
      />
      <DInput
        label="Display Name *"
        value={form.watch('displayName')}
        error={form.formState.errors.displayName?.message}
        onChange={(value) => form.setValue('displayName', value, { shouldValidate: true })}
      />
      <DInput
        label="Legal Name"
        value={form.watch('legalName') ?? ''}
        error={form.formState.errors.legalName?.message}
        onChange={(value) => form.setValue('legalName', value, { shouldValidate: true })}
      />
      <div className="client-form-actions">
        <DButton type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </DButton>
        <DButton type="submit" loading={isSubmitting}>
          {submitLabel}
        </DButton>
      </div>
    </form>
  );
}

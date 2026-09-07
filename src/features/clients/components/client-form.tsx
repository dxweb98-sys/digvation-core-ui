import { DButton, DInput, DTextarea } from '@digvation/ui';
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
  const { code, displayName, legalName, organizationEmail, organizationPhone, website, taxIdentifier, country, timezone, address, notes } = defaultValues;

  useEffect(() => {
    form.reset({ code, displayName, legalName, organizationEmail, organizationPhone, website, taxIdentifier, country, timezone, address, notes });
  }, [address, code, country, displayName, form, legalName, notes, organizationEmail, organizationPhone, taxIdentifier, timezone, website]);

  async function handleSubmit(values: ClientFormValues) {
    const normalizedValues = {
      ...values,
      code: normalizeClientCode(values.code),
      legalName: values.legalName?.trim() || undefined, organizationEmail: values.organizationEmail?.trim() || undefined, organizationPhone: values.organizationPhone?.trim() || undefined, website: values.website?.trim() || undefined, taxIdentifier: values.taxIdentifier?.trim() || undefined, country: values.country?.trim() || undefined, timezone: values.timezone?.trim() || undefined, address: values.address?.trim() || undefined, notes: values.notes?.trim() || undefined,
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
      {mode === 'edit' ? <><div className="client-form-grid"><DInput label="Organization Email" value={form.watch('organizationEmail') ?? ''} error={form.formState.errors.organizationEmail?.message} onChange={(value) => form.setValue('organizationEmail', value, { shouldValidate: true })} /><DInput label="Organization Phone" value={form.watch('organizationPhone') ?? ''} error={form.formState.errors.organizationPhone?.message} onChange={(value) => form.setValue('organizationPhone', value, { shouldValidate: true })} /></div><div className="client-form-grid"><DInput label="Website" value={form.watch('website') ?? ''} error={form.formState.errors.website?.message} onChange={(value) => form.setValue('website', value, { shouldValidate: true })} /><DInput label="Tax Identifier" value={form.watch('taxIdentifier') ?? ''} error={form.formState.errors.taxIdentifier?.message} onChange={(value) => form.setValue('taxIdentifier', value, { shouldValidate: true })} /></div><div className="client-form-grid"><DInput label="Country" value={form.watch('country') ?? ''} error={form.formState.errors.country?.message} onChange={(value) => form.setValue('country', value, { shouldValidate: true })} /><DInput label="Timezone" value={form.watch('timezone') ?? ''} error={form.formState.errors.timezone?.message} onChange={(value) => form.setValue('timezone', value, { shouldValidate: true })} /></div><DTextarea label="Address" value={form.watch('address') ?? ''} error={form.formState.errors.address?.message} onChange={(value) => form.setValue('address', value, { shouldValidate: true })} /><DTextarea label="Notes" value={form.watch('notes') ?? ''} error={form.formState.errors.notes?.message} onChange={(value) => form.setValue('notes', value, { shouldValidate: true })} /></> : null}
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

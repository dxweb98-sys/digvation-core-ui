
import { useValidatedForm } from '../../../shared/forms/use-validated-form';
import { AppInput, AppTextarea } from '../../../shared/ui/form-fields';
import { DialogSection } from '../../../shared/ui/app-dialog';
import { useEffect } from 'react';
import { clientFormSchema, normalizeClientCode, type ClientFormValues } from '../schemas/client-form-schema';

export type ClientFormMode = 'create' | 'edit';

function normalizeValues(values: ClientFormValues) {
  return {
      ...values,
      code: normalizeClientCode(values.code),
      legalName: values.legalName?.trim() || undefined, organizationEmail: values.organizationEmail?.trim() || undefined, organizationPhone: values.organizationPhone?.trim() || undefined, website: values.website?.trim() || undefined, taxIdentifier: values.taxIdentifier?.trim() || undefined, country: values.country?.trim() || undefined, timezone: values.timezone?.trim() || undefined, address: values.address?.trim() || undefined, notes: values.notes?.trim() || undefined,
    };
}

export function ClientForm({
  formId,
  mode,
  defaultValues,
  onSubmit,
}: {
  formId: string;
  mode: ClientFormMode;
  defaultValues: ClientFormValues;
  onSubmit: (values: ClientFormValues) => void | Promise<void>;
}) {
  const { form, field, change, onInvalid, applyServerError } = useValidatedForm<ClientFormValues>({
    formId,
    schema: clientFormSchema,
    defaultValues,
    normalize: normalizeValues,
  });
  const { code, displayName, legalName, organizationEmail, organizationPhone, website, taxIdentifier, country, timezone, address, notes } = defaultValues;

  useEffect(() => {
    form.reset({ code, displayName, legalName, organizationEmail, organizationPhone, website, taxIdentifier, country, timezone, address, notes });
  }, [address, code, country, displayName, form, legalName, notes, organizationEmail, organizationPhone, taxIdentifier, timezone, website]);

  async function handleSubmit(values: ClientFormValues) {
    const normalizedValues = normalizeValues(values);
    const result = clientFormSchema.safeParse(normalizedValues);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof ClientFormValues;
        form.setError(fieldName, { message: issue.message });
      }
      return;
    }

    try {
      await onSubmit(result.data);
    } catch (error) {
      applyServerError(error);
    }
  }

  return (
    <form className="client-form" id={formId} onSubmit={form.handleSubmit(handleSubmit, onInvalid)} noValidate>
      <DialogSection title="Identity">
      <AppInput
        label="Client code" placeholder="NOVA-SALON"
        hint={mode === 'create' ? 'Uppercase letters, numbers and hyphens. Cannot be changed later.' : 'Cannot be changed.'}
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        {...field('code')}
        onChange={(value) => change('code', normalizeClientCode(value))}
      />
      <AppInput
        label="Display name" placeholder="Nova Salon"
        value={form.watch('displayName')}
        {...field('displayName')}
        onChange={(value) => change('displayName', value)}
      />
      <AppInput
        label="Legal name" placeholder="PT Nova Salon Indonesia" optional
        value={form.watch('legalName') ?? ''}
        {...field('legalName')}
        onChange={(value) => change('legalName', value)}
      />
      </DialogSection>
      {mode === 'edit' ? <DialogSection title="Organization"><div className="client-form-grid"><AppInput label="Organization email" placeholder="hello@novasalon.id" optional value={form.watch('organizationEmail') ?? ''} {...field('organizationEmail')} onChange={(value) => change('organizationEmail', value)} /><AppInput label="Organization phone" placeholder="+62 21 5550 1200" optional value={form.watch('organizationPhone') ?? ''} {...field('organizationPhone')} onChange={(value) => change('organizationPhone', value)} /></div><div className="client-form-grid"><AppInput label="Website" placeholder="https://novasalon.id" optional value={form.watch('website') ?? ''} {...field('website')} onChange={(value) => change('website', value)} /><AppInput label="Tax identifier" placeholder="01.234.567.8-901.000" optional value={form.watch('taxIdentifier') ?? ''} {...field('taxIdentifier')} onChange={(value) => change('taxIdentifier', value)} /></div><div className="client-form-grid"><AppInput label="Country" placeholder="Indonesia" optional value={form.watch('country') ?? ''} {...field('country')} onChange={(value) => change('country', value)} /><AppInput label="Timezone" placeholder="Asia/Jakarta" optional value={form.watch('timezone') ?? ''} {...field('timezone')} onChange={(value) => change('timezone', value)} /></div><AppTextarea label="Address" placeholder="Jl. Kemang Raya 14, Jakarta" optional value={form.watch('address') ?? ''} {...field('address')} onChange={(value) => change('address', value)} /><AppTextarea label="Notes" placeholder="Renewal handled by the finance team" optional value={form.watch('notes') ?? ''} {...field('notes')} onChange={(value) => change('notes', value)} /></DialogSection> : null}
    </form>
  );
}

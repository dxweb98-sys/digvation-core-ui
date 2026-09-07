import { DInput, DSelect, DToggle } from '@digvation-labs/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { installationFormSchema, normalizeInstallationCode, type InstallationFormValues } from '../schemas/installation-form-schema';
import { useClientProductOptions } from '../hooks/use-installations';

const ENVIRONMENT_OPTIONS = [{ value: 'PRODUCTION', label: 'Production' }, { value: 'STAGING', label: 'Staging' }, { value: 'DEVELOPMENT', label: 'Development' }];
const DEPLOYMENT_OPTIONS = [{ value: 'SHARED', label: 'Shared' }, { value: 'DEDICATED', label: 'Dedicated' }];
const OWNERSHIP_OPTIONS = [{ value: 'DIGVATION', label: 'Digvation' }, { value: 'CLIENT', label: 'Client' }];

export function InstallationForm({ formId, mode, defaultValues, lockedClientProductLabel, onSubmit }: { formId: string; mode: 'create' | 'edit'; defaultValues: InstallationFormValues; lockedClientProductLabel?: string; onSubmit: (values: InstallationFormValues) => void | Promise<void> }) {
  const form = useForm<InstallationFormValues>({ defaultValues });
  const clientProductOptionsQuery = useClientProductOptions();
  useEffect(() => { form.reset(defaultValues); }, [defaultValues, form]);
  async function submit(values: InstallationFormValues) {
    const result = installationFormSchema.safeParse({ ...values, code: normalizeInstallationCode(values.code), region: values.region?.trim() || undefined, applicationUrl: values.applicationUrl?.trim() || undefined });
    if (!result.success) { result.error.issues.forEach((issue) => form.setError(issue.path[0] as keyof InstallationFormValues, { message: issue.message })); return; }
    await onSubmit(result.data);
  }
  const isClientProductLocked = mode === 'edit' || Boolean(lockedClientProductLabel);
  const clientProductOptions = clientProductOptionsQuery.data?.map((option) => ({ value: option.id, label: option.label }));
  return <form className="installation-form" id={formId} onSubmit={form.handleSubmit(submit)} noValidate>
    <section className="installation-form-section" aria-labelledby={`${formId}-relationship`}>
      <div className="installation-form-section-heading"><h2 id={`${formId}-relationship`}>Relationship</h2><p>Select the existing client product that owns this runtime instance.</p></div>
      <DSelect label="Client Product *" placeholder="Select client and product" value={form.watch('clientProductId')} disabled={isClientProductLocked || clientProductOptionsQuery.isPending} hint={lockedClientProductLabel ? `${lockedClientProductLabel} is locked for this contextual creation.` : undefined} error={form.formState.errors.clientProductId?.message} options={clientProductOptions} onValueChange={(value) => form.setValue('clientProductId', typeof value === 'string' ? value : '', { shouldValidate: true })} />
    </section>
    <section className="installation-form-section" aria-labelledby={`${formId}-installation`}>
      <div className="installation-form-section-heading"><h2 id={`${formId}-installation`}>Installation</h2><p>Set the stable runtime identity and operator-facing name.</p></div>
      <div className="installation-form-grid"><DInput label="Installation Code *" hint={mode === 'create' ? 'Uppercase letters, numbers, and hyphens only.' : 'Installation code is immutable after creation.'} value={form.watch('code')} readOnly={mode === 'edit'} disabled={mode === 'edit'} error={form.formState.errors.code?.message} onChange={(value) => form.setValue('code', normalizeInstallationCode(value), { shouldValidate: true })} /><DInput label="Name *" value={form.watch('name')} error={form.formState.errors.name?.message} onChange={(value) => form.setValue('name', value, { shouldValidate: true })} /></div>
    </section>
    <section className="installation-form-section" aria-labelledby={`${formId}-deployment`}>
      <div className="installation-form-section-heading"><h2 id={`${formId}-deployment`}>Deployment</h2><p>Deployment mode, infrastructure ownership, and Digvation management are independent choices.</p></div>
      <div className="installation-form-grid"><DSelect label="Environment *" value={form.watch('environment')} options={ENVIRONMENT_OPTIONS} onValueChange={(value) => form.setValue('environment', value as InstallationFormValues['environment'], { shouldValidate: true })} /><DSelect label="Deployment Mode *" value={form.watch('deploymentMode')} options={DEPLOYMENT_OPTIONS} onValueChange={(value) => form.setValue('deploymentMode', value as InstallationFormValues['deploymentMode'], { shouldValidate: true })} /></div>
      <div className="installation-form-grid installation-ownership-grid"><DSelect label="Infrastructure Ownership *" value={form.watch('infrastructureOwnership')} options={OWNERSHIP_OPTIONS} onValueChange={(value) => form.setValue('infrastructureOwnership', value as InstallationFormValues['infrastructureOwnership'], { shouldValidate: true })} /><div className="installation-managed-toggle"><DToggle label="Managed by Digvation" checked={form.watch('managedByDigvation')} onChange={(value) => form.setValue('managedByDigvation', value)} /></div></div>
    </section>
    <section className="installation-form-section" aria-labelledby={`${formId}-location-access`}>
      <div className="installation-form-section-heading"><h2 id={`${formId}-location-access`}>Location &amp; Access</h2><p>Optional location and operator access information.</p></div>
      <div className="installation-form-grid"><DInput label="Region" value={form.watch('region') ?? ''} error={form.formState.errors.region?.message} onChange={(value) => form.setValue('region', value, { shouldValidate: true })} /><DInput label="Application URL" value={form.watch('applicationUrl') ?? ''} error={form.formState.errors.applicationUrl?.message} onChange={(value) => form.setValue('applicationUrl', value, { shouldValidate: true })} /></div>
    </section>
  </form>;
}

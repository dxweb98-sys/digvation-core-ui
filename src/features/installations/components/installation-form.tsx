import { DCheckbox, DInput, DSelect, DToggle } from '@digvation/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  installationFormSchema,
  normalizeInstallationCode,
  type InstallationFormValues,
} from '../schemas/installation-form-schema';
import {
  useClientProductOptions,
  useInstallationClientOptions,
} from '../hooks/use-installations';

const ENVIRONMENT_OPTIONS = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'DEVELOPMENT', label: 'Development' },
];
const DEPLOYMENT_OPTIONS = [
  { value: 'SHARED', label: 'Shared' },
  { value: 'DEDICATED', label: 'Dedicated' },
];
const OWNERSHIP_OPTIONS = [
  { value: 'DIGVATION', label: 'Digvation' },
  { value: 'CLIENT', label: 'Client' },
];
const BRANDING_OPTIONS = [
  { value: 'DIGVATION', label: 'Digvation' },
  { value: 'WHITE_LABEL', label: 'White label' },
];

export function InstallationForm({
  formId,
  mode,
  defaultValues,
  onSubmit,
}: {
  formId: string;
  mode: 'create' | 'edit';
  defaultValues: InstallationFormValues;
  onSubmit: (values: InstallationFormValues) => void | Promise<void>;
}) {
  const form = useForm<InstallationFormValues>({ defaultValues });
  const clientId = form.watch('clientId');
  const deploymentMode = form.watch('deploymentMode');
  const brandingMode = form.watch('brandingMode');
  const selectedProducts = form.watch('clientProductIds');
  const clientsQuery = useInstallationClientOptions();
  const productsQuery = useClientProductOptions(clientId);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  async function submit(values: InstallationFormValues) {
    const result = installationFormSchema.safeParse({
      ...values,
      code: normalizeInstallationCode(values.code),
      region: values.region?.trim() || undefined,
      applicationUrl: values.applicationUrl?.trim() || '',
      brandName: values.brandName?.trim() || undefined,
      logoUrl: values.logoUrl?.trim() || '',
      faviconUrl: values.faviconUrl?.trim() || '',
      primaryColor: values.primaryColor?.trim() || undefined,
      secondaryColor: values.secondaryColor?.trim() || undefined,
      customDomain: values.customDomain?.trim() || undefined,
      supportName: values.supportName?.trim() || undefined,
      supportEmail: values.supportEmail?.trim() || '',
    });
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        form.setError(issue.path[0] as keyof InstallationFormValues, {
          message: issue.message,
        }),
      );
      return;
    }
    await onSubmit(result.data);
  }

  function setClient(nextClientId: string) {
    form.setValue('clientId', nextClientId, { shouldValidate: true });
    form.setValue('clientProductIds', [], { shouldValidate: true });
  }

  function toggleProduct(clientProductId: string, checked: boolean) {
    const next = new Set(form.getValues('clientProductIds'));
    if (checked) next.add(clientProductId);
    else next.delete(clientProductId);
    form.setValue('clientProductIds', [...next], { shouldValidate: true });
  }

  return (
    <form className="installation-form" id={formId} onSubmit={form.handleSubmit(submit)} noValidate>
      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Client &amp; Products</h2>
          <p>An Installation belongs to one Client and can deliver multiple assigned Products.</p>
        </div>
        <DSelect
          label="Client *"
          placeholder="Select client"
          value={clientId}
          disabled={mode === 'edit' || clientsQuery.isPending}
          options={clientsQuery.data?.map((client) => ({ value: client.id, label: client.label }))}
          error={form.formState.errors.clientId?.message}
          clearable={false}
          onValueChange={(value) => setClient(typeof value === 'string' ? value : '')}
        />
        <div className="installation-product-selection">
          <span className="installation-field-label">Products *</span>
          {!clientId ? <p>Select a Client first.</p> : null}
          {clientId && productsQuery.isPending ? <p>Loading assigned products…</p> : null}
          {clientId && productsQuery.isSuccess && productsQuery.data.length === 0 ? (
            <p>No eligible Client Products are available.</p>
          ) : null}
          {productsQuery.data?.map((product) => (
            <label className="installation-product-option" key={product.id}>
              <DCheckbox
                checked={selectedProducts.includes(product.id)}
                onChange={(event) => toggleProduct(product.id, event.target.checked)}
              />
              <span>
                <strong>{product.productName}</strong>
                <small>{product.productCode} · {product.status}</small>
              </span>
            </label>
          ))}
          {form.formState.errors.clientProductIds?.message ? (
            <p className="installation-form-error">{form.formState.errors.clientProductIds.message}</p>
          ) : null}
        </div>
      </section>

      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Installation</h2>
          <p>Set the stable runtime identity and operator-facing name.</p>
        </div>
        <div className="installation-form-grid">
          <DInput
            label="Installation Code *"
            value={form.watch('code')}
            disabled={mode === 'edit'}
            readOnly={mode === 'edit'}
            maxLength={80}
            error={form.formState.errors.code?.message}
            onChange={(value) => form.setValue('code', normalizeInstallationCode(value), { shouldValidate: true })}
          />
          <DInput
            label="Name *"
            value={form.watch('name')}
            maxLength={150}
            error={form.formState.errors.name?.message}
            onChange={(value) => form.setValue('name', value, { shouldValidate: true })}
          />
        </div>
      </section>

      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Deployment</h2>
          <p>Deployment isolation, infrastructure ownership, and operational management stay separate.</p>
        </div>
        <div className="installation-form-grid">
          <DSelect
            label="Environment *"
            value={form.watch('environment')}
            options={ENVIRONMENT_OPTIONS}
            clearable={false}
            onValueChange={(value) => form.setValue('environment', value as InstallationFormValues['environment'])}
          />
          <DSelect
            label="Deployment Mode *"
            value={deploymentMode}
            options={DEPLOYMENT_OPTIONS}
            clearable={false}
            onValueChange={(value) => {
              const next = value as InstallationFormValues['deploymentMode'];
              form.setValue('deploymentMode', next, { shouldValidate: true });
              if (next === 'DEDICATED') {
                form.setValue('brandingMode', 'WHITE_LABEL', { shouldValidate: true });
              }
            }}
          />
        </div>
        <div className="installation-form-grid installation-ownership-grid">
          <DSelect
            label="Infrastructure Ownership *"
            value={form.watch('infrastructureOwnership')}
            options={OWNERSHIP_OPTIONS}
            clearable={false}
            onValueChange={(value) => form.setValue('infrastructureOwnership', value as InstallationFormValues['infrastructureOwnership'])}
          />
          <div className="installation-managed-toggle">
            <DToggle
              label="Managed by Digvation"
              checked={form.watch('managedByDigvation')}
              onChange={(value) => form.setValue('managedByDigvation', value)}
            />
          </div>
        </div>
        <div className="installation-form-grid">
          <DInput label="Region" value={form.watch('region') ?? ''} onChange={(value) => form.setValue('region', value)} />
          <DInput
            label="Application URL"
            value={form.watch('applicationUrl') ?? ''}
            error={form.formState.errors.applicationUrl?.message}
            onChange={(value) => form.setValue('applicationUrl', value, { shouldValidate: true })}
          />
        </div>
      </section>

      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Branding</h2>
          <p>Dedicated installations always require white-label branding. Shared installations may use Digvation branding.</p>
        </div>
        <DSelect
          label="Branding Mode *"
          value={brandingMode}
          options={BRANDING_OPTIONS}
          disabled={deploymentMode === 'DEDICATED'}
          clearable={false}
          error={form.formState.errors.brandingMode?.message}
          onValueChange={(value) => form.setValue('brandingMode', value as InstallationFormValues['brandingMode'], { shouldValidate: true })}
        />
        {brandingMode === 'WHITE_LABEL' ? (
          <>
            <div className="installation-form-grid">
              <DInput
                label="Brand Name *"
                value={form.watch('brandName') ?? ''}
                error={form.formState.errors.brandName?.message}
                onChange={(value) => form.setValue('brandName', value, { shouldValidate: true })}
              />
              <DInput label="Custom Domain" value={form.watch('customDomain') ?? ''} onChange={(value) => form.setValue('customDomain', value)} />
            </div>
            <div className="installation-form-grid">
              <DInput label="Logo URL" value={form.watch('logoUrl') ?? ''} error={form.formState.errors.logoUrl?.message} onChange={(value) => form.setValue('logoUrl', value, { shouldValidate: true })} />
              <DInput label="Favicon URL" value={form.watch('faviconUrl') ?? ''} error={form.formState.errors.faviconUrl?.message} onChange={(value) => form.setValue('faviconUrl', value, { shouldValidate: true })} />
            </div>
            <div className="installation-form-grid">
              <DInput label="Primary Color" placeholder="#0F172A" value={form.watch('primaryColor') ?? ''} onChange={(value) => form.setValue('primaryColor', value)} />
              <DInput label="Secondary Color" placeholder="#FFFFFF" value={form.watch('secondaryColor') ?? ''} onChange={(value) => form.setValue('secondaryColor', value)} />
            </div>
            <div className="installation-form-grid">
              <DInput label="Support Name" value={form.watch('supportName') ?? ''} onChange={(value) => form.setValue('supportName', value)} />
              <DInput label="Support Email" value={form.watch('supportEmail') ?? ''} error={form.formState.errors.supportEmail?.message} onChange={(value) => form.setValue('supportEmail', value, { shouldValidate: true })} />
            </div>
          </>
        ) : null}
      </section>
    </form>
  );
}

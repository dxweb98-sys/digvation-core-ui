import { useValidatedForm } from '../../../shared/forms/use-validated-form';
import { AppInput, AppSelect } from '../../../shared/ui/form-fields';
import { labelFor } from '../../../shared/labels/labels';
import { DCheckbox, DToggle } from '@digvation/ui';
import { useEffect } from 'react';
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

function normalizeValues(values: InstallationFormValues) {
  return {
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
    };
}

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
  const { form, field, change, onInvalid, applyServerError } = useValidatedForm<InstallationFormValues>({
    formId,
    schema: installationFormSchema,
    defaultValues,
    normalize: normalizeValues,
  });
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
    const result = installationFormSchema.safeParse(normalizeValues(values));
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        form.setError(issue.path[0] as keyof InstallationFormValues, {
          message: issue.message,
        }),
      );
      return;
    }
    try {
      await onSubmit(result.data);
    } catch (error) {
      applyServerError(error);
    }
  }

  function setClient(nextClientId: string) {
    change('clientId', nextClientId);
    change('clientProductIds', []);
  }

  function toggleProduct(clientProductId: string, checked: boolean) {
    const next = new Set(form.getValues('clientProductIds'));
    if (checked) next.add(clientProductId);
    else next.delete(clientProductId);
    change('clientProductIds', [...next]);
  }

  return (
    <form className="installation-form" id={formId} onSubmit={form.handleSubmit(submit, onInvalid)} noValidate>
      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Client and products</h2>
          </div>
        <AppSelect
          label="Client"
          placeholder="Select client"
          value={clientId}
          disabled={mode === 'edit' || clientsQuery.isPending}
          options={clientsQuery.data?.map((client) => ({ value: client.id, label: client.label }))}
          {...field('clientId')}
          clearable={false}
          onValueChange={(value) => setClient(typeof value === 'string' ? value : '')}
        />
        <div className="installation-product-selection">
          <span className="installation-field-label">Products</span>
          {!clientId ? <p className="installation-field-hint">Select a client first.</p> : null}
          {clientId && productsQuery.isPending ? <p>Loading assigned products…</p> : null}
          {clientId && productsQuery.isSuccess && productsQuery.data.length === 0 ? (
            <p>This client has no products to install.</p>
          ) : null}
          {productsQuery.data?.map((product) => (
            <label className="installation-product-option" key={product.id}>
              <DCheckbox
                checked={selectedProducts.includes(product.id)}
                onChange={(event) => toggleProduct(product.id, event.target.checked)}
              />
              <span>
                <strong>{product.productName}</strong>
                <small>{product.productCode}, {labelFor(product.status)}</small>
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
          </div>
        <div className="installation-form-grid">
          <AppInput
            label="Installation code" placeholder="nova-production"
            value={form.watch('code')}
            disabled={mode === 'edit'}
            readOnly={mode === 'edit'}
            maxLength={80}
            {...field('code')}
            onChange={(value) => change('code', normalizeInstallationCode(value))}
          />
          <AppInput
            label="Name" placeholder="Nova production"
            value={form.watch('name')}
            maxLength={150}
            {...field('name')}
            onChange={(value) => change('name', value)}
          />
        </div>
      </section>

      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Deployment</h2>
          </div>
        <div className="installation-form-grid">
          <AppSelect {...field('environment')}
            label="Environment" placeholder="Select an environment"
            value={form.watch('environment')}
            options={ENVIRONMENT_OPTIONS}
            clearable={false}
            onValueChange={(value) => form.setValue('environment', value as InstallationFormValues['environment'])}
          />
          <AppSelect
            label="Deployment mode" placeholder="Select a deployment mode"
            value={deploymentMode}
            options={DEPLOYMENT_OPTIONS}
            clearable={false}
            onValueChange={(value) => {
              const next = value as InstallationFormValues['deploymentMode'];
              change('deploymentMode', next);
              if (next === 'DEDICATED') {
                change('brandingMode', 'WHITE_LABEL');
              }
            }}
          />
        </div>
        <div className="installation-form-grid installation-ownership-grid">
          <AppSelect {...field('infrastructureOwnership')}
            label="Infrastructure ownership" placeholder="Select who owns it"
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
          <AppInput {...field('region')} label="Region" placeholder="Jakarta, Indonesia" optional value={form.watch('region') ?? ''} onChange={(value) => form.setValue('region', value)} />
          <AppInput
            label="Application URL" placeholder="https://app.novasalon.id" optional
            value={form.watch('applicationUrl') ?? ''}
            {...field('applicationUrl')}
            onChange={(value) => change('applicationUrl', value)}
          />
        </div>
      </section>

      <section className="installation-form-section">
        <div className="installation-form-section-heading">
          <h2>Branding</h2>
          <p>Dedicated installations must use white label branding.</p>
        </div>
        <AppSelect
          label="Branding mode" placeholder="Select a branding mode"
          value={brandingMode}
          options={BRANDING_OPTIONS}
          disabled={deploymentMode === 'DEDICATED'}
          clearable={false}
          {...field('brandingMode')}
          onValueChange={(value) => change('brandingMode', value as InstallationFormValues['brandingMode'])}
        />
        {brandingMode === 'WHITE_LABEL' ? (
          <>
            <div className="installation-form-grid">
              <AppInput
                label="Brand name" placeholder="Nova Salon"
                value={form.watch('brandName') ?? ''}
                {...field('brandName')}
                onChange={(value) => change('brandName', value)}
              />
              <AppInput {...field('customDomain')} label="Custom domain" placeholder="app.novasalon.id" optional value={form.watch('customDomain') ?? ''} onChange={(value) => form.setValue('customDomain', value)} />
            </div>
            <div className="installation-form-grid">
              <AppInput label="Logo URL" placeholder="https://novasalon.id/logo.svg" optional value={form.watch('logoUrl') ?? ''} {...field('logoUrl')} onChange={(value) => change('logoUrl', value)} />
              <AppInput label="Favicon URL" placeholder="https://novasalon.id/favicon.ico" optional value={form.watch('faviconUrl') ?? ''} {...field('faviconUrl')} onChange={(value) => change('faviconUrl', value)} />
            </div>
            <div className="installation-form-grid">
              <AppInput {...field('primaryColor')} label="Primary color" optional placeholder="#0F172A" value={form.watch('primaryColor') ?? ''} onChange={(value) => form.setValue('primaryColor', value)} />
              <AppInput {...field('secondaryColor')} label="Secondary color" optional placeholder="#FFFFFF" value={form.watch('secondaryColor') ?? ''} onChange={(value) => form.setValue('secondaryColor', value)} />
            </div>
            <div className="installation-form-grid">
              <AppInput {...field('supportName')} label="Support name" placeholder="Nova support" optional value={form.watch('supportName') ?? ''} onChange={(value) => form.setValue('supportName', value)} />
              <AppInput label="Support email" placeholder="support@novasalon.id" optional value={form.watch('supportEmail') ?? ''} {...field('supportEmail')} onChange={(value) => change('supportEmail', value)} />
            </div>
          </>
        ) : null}
      </section>
    </form>
  );
}

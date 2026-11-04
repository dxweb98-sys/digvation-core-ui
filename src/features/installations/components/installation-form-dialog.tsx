import { DAlert, DButton, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useEffect, useRef, useState } from 'react';
import {
  useCreateInstallation,
  useReplaceInstallationProducts,
  useUpdateInstallation,
  useUpdateInstallationBranding,
} from '../hooks/use-installation-mutations';
import type { InstallationFormValues } from '../schemas/installation-form-schema';
import type { BrandingProfile, InstallationSummary } from '../types/installation';
import { InstallationForm } from './installation-form';

const FORM_ID = 'installation-form';

function brandingFromValues(values: InstallationFormValues): BrandingProfile {
  if (values.brandingMode === 'DIGVATION') return { mode: 'DIGVATION' };
  return {
    mode: 'WHITE_LABEL',
    brandName: values.brandName?.trim(),
    logoUrl: values.logoUrl?.trim() || undefined,
    faviconUrl: values.faviconUrl?.trim() || undefined,
    primaryColor: values.primaryColor?.trim() || undefined,
    secondaryColor: values.secondaryColor?.trim() || undefined,
    customDomain: values.customDomain?.trim() || undefined,
    supportName: values.supportName?.trim() || undefined,
    supportEmail: values.supportEmail?.trim() || undefined,
  };
}

function valuesFromInstallation(installation: InstallationSummary): InstallationFormValues {
  return {
    clientId: installation.clientId,
    clientProductIds: installation.products.map((product) => product.clientProductId),
    code: installation.code,
    name: installation.name,
    environment: installation.environment,
    deploymentMode: installation.deploymentMode,
    infrastructureOwnership: installation.infrastructureOwnership,
    managedByDigvation: installation.managedByDigvation,
    region: installation.region ?? '',
    applicationUrl: installation.applicationUrl ?? '',
    brandingMode: installation.branding.mode,
    brandName: installation.branding.brandName ?? '',
    logoUrl: installation.branding.logoUrl ?? '',
    faviconUrl: installation.branding.faviconUrl ?? '',
    primaryColor: installation.branding.primaryColor ?? '',
    secondaryColor: installation.branding.secondaryColor ?? '',
    customDomain: installation.branding.customDomain ?? '',
    supportName: installation.branding.supportName ?? '',
    supportEmail: installation.branding.supportEmail ?? '',
  };
}

function productSetChanged(installation: InstallationSummary, clientProductIds: string[]) {
  const current = new Set(installation.products.map((product) => product.clientProductId));
  const next = new Set(clientProductIds);
  return current.size !== next.size || [...next].some((id) => !current.has(id));
}

const CREATE_DEFAULTS: InstallationFormValues = {
  clientId: '',
  clientProductIds: [],
  code: '',
  name: '',
  environment: 'PRODUCTION',
  deploymentMode: 'SHARED',
  infrastructureOwnership: 'DIGVATION',
  managedByDigvation: true,
  region: '',
  applicationUrl: '',
  brandingMode: 'DIGVATION',
  brandName: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
  secondaryColor: '',
  customDomain: '',
  supportName: '',
  supportEmail: '',
};

export function InstallationFormDialog({
  open,
  mode,
  installation,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  installation?: InstallationSummary;
  onClose: () => void;
}) {
  const createInstallation = useCreateInstallation();
  const updateInstallation = useUpdateInstallation(installation?.id ?? '');
  const replaceProducts = useReplaceInstallationProducts();
  const updateBranding = useUpdateInstallationBranding();
  const { showToast } = useToast();
  const [saveError, setSaveError] = useState<{ title: string; message: string } | null>(null);
  const saveErrorRef = useRef<HTMLDivElement>(null);
  const isEditing = mode === 'edit';
  const isSubmitting =
    createInstallation.isPending ||
    updateInstallation.isPending ||
    replaceProducts.isPending ||
    updateBranding.isPending;

  useEffect(() => {
    if (!open) setSaveError(null);
  }, [open]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [saveError]);

  async function submit(values: InstallationFormValues) {
    setSaveError(null);
    // Edits are separate CORE calls, so a later call can fail after earlier ones saved.
    let savedEarlierStep = false;
    try {
      const branding = brandingFromValues(values);
      if (!isEditing) {
        await createInstallation.mutateAsync({
          clientId: values.clientId,
          clientProductIds: values.clientProductIds,
          code: values.code,
          name: values.name,
          environment: values.environment,
          deploymentMode: values.deploymentMode,
          infrastructureOwnership: values.infrastructureOwnership,
          managedByDigvation: values.managedByDigvation,
          region: values.region,
          applicationUrl: values.applicationUrl,
          branding,
        });
      } else if (installation) {
        const metadata = {
          name: values.name,
          environment: values.environment,
          deploymentMode: values.deploymentMode,
          infrastructureOwnership: values.infrastructureOwnership,
          managedByDigvation: values.managedByDigvation,
          region: values.region,
          applicationUrl: values.applicationUrl,
        };
        // Policy-safe ordering when crossing the Dedicated/white-label boundary.
        if (values.deploymentMode === 'DEDICATED') {
          await updateBranding.mutateAsync({ installationId: installation.id, branding });
          savedEarlierStep = true;
          await updateInstallation.mutateAsync(metadata);
        } else {
          await updateInstallation.mutateAsync(metadata);
          savedEarlierStep = true;
          await updateBranding.mutateAsync({ installationId: installation.id, branding });
        }
        if (productSetChanged(installation, values.clientProductIds)) {
          await replaceProducts.mutateAsync({
            installationId: installation.id,
            clientProductIds: values.clientProductIds,
          });
        }
      }
      showToast({
        title: isEditing ? 'Installation updated' : 'Installation created',
        description: isEditing
          ? `${values.name} composition and branding were updated.`
          : `${values.name} starts in provisioning.`,
        variant: 'success',
      });
      onClose();
    } catch (error) {
      const failure = error instanceof Error ? error.message : 'The installation could not be saved.';
      const title = savedEarlierStep
        ? 'Installation partly updated'
        : isEditing
          ? 'Installation update failed'
          : 'Installation creation failed';
      const message = savedEarlierStep
        ? `${failure.replace(/\.?$/, '.')} Your other changes in this form were saved.`
        : failure;
      setSaveError({ title, message });
      showToast({ title, description: message, variant: 'danger' });
    }
  }

  const values = installation ? valuesFromInstallation(installation) : CREATE_DEFAULTS;

  return (
    <AppDialog kind="wide"
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title={isEditing ? `Edit ${installation?.name ?? 'installation'}` : 'Add installation'}
      description={
        isEditing
          ? 'Update the Client-scoped runtime composition, deployment policy, and branding.'
          : 'Create one Client installation that may deliver multiple assigned Products.'
      }
      footer={
        <div className="installation-dialog-actions">
          <DButton variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</DButton>
          <DButton form={FORM_ID} type="submit" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Installation'}
          </DButton>
        </div>
      }
    >
      {saveError ? (
        <div ref={saveErrorRef} className="installation-form-save-error">
          <DAlert variant="danger" title={saveError.title}>{saveError.message}</DAlert>
        </div>
      ) : null}
      <InstallationForm
        formId={FORM_ID}
        mode={mode}
        defaultValues={values}
        onSubmit={submit}
      />
    </AppDialog>
  );
}

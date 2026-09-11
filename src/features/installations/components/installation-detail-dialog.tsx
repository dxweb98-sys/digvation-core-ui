import {
  DButton,
  DCard,
  DCardContent,
  DConnectionError,
  DDialog,
  DEmptyState,
  DLoadingIndicator,
} from '@digvation/ui';
import { useState } from 'react';
import { InstallationInfrastructureTab } from '../../infrastructure/components/installation-infrastructure-tab';
import { InstallationActionRequest } from '../../operations/components/installation-action-request';
import { InstallationRuntimeTab } from '../../runtime/components/installation-runtime-tab';
import { useInstallationStatusTransition } from '../hooks/use-installation-mutations';
import { useInstallationDetail } from '../hooks/use-installations';
import type { InstallationStatus } from '../types/installation';
import { InstallationFormDialog } from './installation-form-dialog';
import { InstallationLifecycleAction } from './installation-lifecycle-action';
import { InstallationStatusBadge } from './installation-status-badge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function InstallationDetailDialog({
  installationId,
  open,
  onClose,
}: {
  installationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const installationQuery = useInstallationDetail(installationId);
  const transition = useInstallationStatusTransition();

  if (installationQuery.isPending) {
    return (
      <DDialog open={open} onClose={onClose} size="xl" title="Installation details">
        <div className="installation-state"><DLoadingIndicator label="Loading installation detail" /></div>
      </DDialog>
    );
  }

  if (installationQuery.isError) {
    return (
      <DDialog open={open} onClose={onClose} size="xl" title="Installation unavailable">
        <DConnectionError
          title="Installation unavailable"
          message="Installation information could not be loaded."
          detail={installationQuery.error.message}
          onRetry={() => void installationQuery.refetch()}
        />
      </DDialog>
    );
  }

  if (!installationQuery.data) {
    return (
      <DDialog open={open} onClose={onClose} size="xl" title="Installation not found">
        <DEmptyState title="Installation not found" description="The requested installation does not exist." />
      </DDialog>
    );
  }

  const installation = installationQuery.data;
  const branding = installation.branding;

  return (
    <>
      <DDialog
        open={open}
        onClose={onClose}
        size="xl"
        title={installation.name}
        description={<code className="installation-code">{installation.code}</code>}
        footer={
          <div className="installation-dialog-actions">
            <DButton variant="outline" onClick={onClose}>Close</DButton>
            <DButton variant="outline" onClick={() => setIsEditOpen(true)}>Edit Installation</DButton>
            <InstallationLifecycleAction
              installation={installation}
              isSubmitting={transition.isPending}
              onTransition={async (targetStatus: InstallationStatus, reason) => {
                await transition.mutateAsync({ installationId: installation.id, targetStatus, reason });
              }}
            />
          </div>
        }
      >
        <div className="installation-detail">
          <InstallationStatusBadge status={installation.status} />
          <DCard variant="outlined">
            <DCardContent>
              <dl className="installation-overview-list">
                <div><dt>Client</dt><dd>{installation.clientName} · {installation.clientCode}</dd></div>
                <div><dt>Environment</dt><dd>{installation.environment}</dd></div>
                <div><dt>Lifecycle status</dt><dd><InstallationStatusBadge status={installation.status} /></dd></div>
                <div><dt>Deployment mode</dt><dd>{installation.deploymentMode}</dd></div>
                <div><dt>Infrastructure ownership</dt><dd>{installation.infrastructureOwnership}</dd></div>
                <div><dt>Managed by Digvation</dt><dd>{installation.managedByDigvation ? 'Yes' : 'No'}</dd></div>
                <div><dt>Region</dt><dd>{installation.region ?? 'Not recorded'}</dd></div>
                <div><dt>Application URL</dt><dd>{installation.applicationUrl ? <a href={installation.applicationUrl} target="_blank" rel="noreferrer">{installation.applicationUrl}</a> : 'Not recorded'}</dd></div>
                <div><dt>Created</dt><dd>{formatDate(installation.createdAt)}</dd></div>
                <div><dt>Updated</dt><dd>{formatDate(installation.updatedAt)}</dd></div>
              </dl>
            </DCardContent>
          </DCard>

          <section className="installation-infrastructure-section">
            <h2>Products</h2>
            <p>This Client-scoped Installation delivers the following assigned Products.</p>
            <div className="installation-product-bindings">
              {installation.products.map((product) => (
                <div className="installation-product-binding" key={product.clientProductId}>
                  <strong>{product.productName}</strong>
                  <code>{product.productCode}</code>
                  <span>{product.clientProductStatus}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="installation-infrastructure-section">
            <h2>Branding</h2>
            <p>Branding is independent from Product entitlement and deployment ownership.</p>
            <DCard variant="outlined">
              <DCardContent>
                <dl className="installation-overview-list">
                  <div><dt>Mode</dt><dd>{branding.mode}</dd></div>
                  <div><dt>Brand name</dt><dd>{branding.brandName ?? (branding.mode === 'DIGVATION' ? 'Digvation' : 'Not recorded')}</dd></div>
                  <div><dt>Custom domain</dt><dd>{branding.customDomain ?? 'Not recorded'}</dd></div>
                  <div><dt>Primary color</dt><dd>{branding.primaryColor ?? 'Not recorded'}</dd></div>
                  <div><dt>Secondary color</dt><dd>{branding.secondaryColor ?? 'Not recorded'}</dd></div>
                  <div><dt>Support</dt><dd>{branding.supportName ?? branding.supportEmail ?? 'Not recorded'}</dd></div>
                </dl>
              </DCardContent>
            </DCard>
          </section>

          <section className="installation-infrastructure-section">
            <h2>Infrastructure</h2>
            <p>Registered infrastructure remains a separate operational authority.</p>
            <InstallationInfrastructureTab installationId={installation.id} />
          </section>
          <section className="installation-infrastructure-section">
            <h2>Runtime</h2>
            <p>Runtime health remains a separate operational projection.</p>
            <InstallationRuntimeTab installationId={installation.id} />
          </section>
          <InstallationActionRequest installationId={installation.id} installationName={installation.name} />
        </div>
      </DDialog>
      <InstallationFormDialog
        open={isEditOpen}
        mode="edit"
        installation={installation}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}

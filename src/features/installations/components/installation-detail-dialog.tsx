import {
  DButton,
  DConnectionError,
  DEmptyState,
  DInfoNote,
  DLoadingIndicator,
} from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions, DialogSection } from '../../../shared/ui/app-dialog';
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
      <AppDialog kind="detail" open={open} onClose={onClose} title="Installation details">
        <div className="installation-state"><DLoadingIndicator label="Loading installation detail" /></div>
      </AppDialog>
    );
  }

  if (installationQuery.isError) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Installation unavailable">
        <DConnectionError
          title="Installation unavailable"
          message="Installation information could not be loaded."
          detail={installationQuery.error.message}
          onRetry={() => void installationQuery.refetch()}
        />
      </AppDialog>
    );
  }

  if (!installationQuery.data) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Installation not found">
        <DEmptyState title="Installation not found" description="The requested installation does not exist." />
      </AppDialog>
    );
  }

  const installation = installationQuery.data;
  const branding = installation.branding;
  const isDecommissioned = installation.status === 'DECOMMISSIONED';

  return (
    <>
      <AppDialog kind="detail"
        open={open}
        onClose={onClose}
        title={installation.name}
        status={<InstallationStatusBadge status={installation.status} />}
        identifier={installation.code}
        meta={`${installation.clientName}, ${installation.environment}`}
        footer={
          <DialogActions
            destructive={
              <InstallationLifecycleAction
                installation={installation}
                isSubmitting={transition.isPending}
                onTransition={async (targetStatus: InstallationStatus, reason) => {
                  await transition.mutateAsync({ installationId: installation.id, targetStatus, reason });
                }}
              />
            }
            secondary={<DButton variant="outline" onClick={onClose}>Close</DButton>}
            primary={isDecommissioned ? null : <DButton onClick={() => setIsEditOpen(true)}>Edit Installation</DButton>}
          />
        }
      >
        <div className="installation-detail">
          {isDecommissioned ? (
            <DInfoNote>
              This installation is decommissioned and can no longer be edited. Its products stay listed as history.
            </DInfoNote>
          ) : null}
          <div><DialogSection title="Deployment">
            <DetailList>
              <DetailItem label="Client">{installation.clientName} · {installation.clientCode}</DetailItem>
              <DetailItem label="Environment">{installation.environment}</DetailItem>
              <DetailItem label="Lifecycle status"><InstallationStatusBadge status={installation.status} /></DetailItem>
              <DetailItem label="Deployment mode">{installation.deploymentMode}</DetailItem>
              <DetailItem label="Infrastructure ownership">{installation.infrastructureOwnership}</DetailItem>
              <DetailItem label="Managed by Digvation">{installation.managedByDigvation ? 'Yes' : 'No'}</DetailItem>
              <DetailItem label="Region">{installation.region}</DetailItem>
              <DetailItem label="Application URL">{installation.applicationUrl ? <a href={installation.applicationUrl} target="_blank" rel="noreferrer">{installation.applicationUrl}</a> : null}</DetailItem>
            </DetailList>
          </DialogSection>
          <DialogSection title="Record">
            <DetailList>
              <DetailItem label="Created">{formatDate(installation.createdAt)}</DetailItem>
              <DetailItem label="Updated">{formatDate(installation.updatedAt)}</DetailItem>
            </DetailList>
          </DialogSection></div>

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
            <DetailList>
                  <DetailItem label="Mode">{branding.mode}</DetailItem>
                  <DetailItem label="Brand name">{branding.brandName ?? (branding.mode === 'DIGVATION' ? 'Digvation' : null)}</DetailItem>
                  <DetailItem label="Custom domain">{branding.customDomain}</DetailItem>
                  <DetailItem label="Primary color">{branding.primaryColor}</DetailItem>
                  <DetailItem label="Secondary color">{branding.secondaryColor}</DetailItem>
                  <DetailItem label="Support">{branding.supportName ?? branding.supportEmail}</DetailItem>
                </DetailList>
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
      </AppDialog>
      <InstallationFormDialog
        open={isEditOpen}
        mode="edit"
        installation={installation}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}

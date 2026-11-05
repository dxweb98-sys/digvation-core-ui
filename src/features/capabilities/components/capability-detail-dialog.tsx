import { AppAction } from '../../../shared/ui/app-action';
import { DConnectionError, DEmptyState, DLoadingIndicator } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions, DialogSection } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useCapabilityDetail } from '../hooks/use-capability-detail';
import { useCapabilityStatusTransition } from '../hooks/use-capability-mutations';
import type { CapabilityStatus } from '../types/capability';
import { CapabilityFormDialog } from './capability-form-dialog';
import { CapabilityLifecycleAction } from './capability-lifecycle-action';
import { CapabilityStatusBadge } from './capability-status-badge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function CapabilityDetailDialog({
  capabilityId,
  open,
  onClose,
}: {
  capabilityId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const capabilityQuery = useCapabilityDetail(capabilityId);
  const statusTransition = useCapabilityStatusTransition();

  if (capabilityQuery.isPending) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Capability details">
        <div className="capability-page-state">
          <DLoadingIndicator label="Loading capability detail" />
        </div>
      </AppDialog>
    );
  }

  if (capabilityQuery.isError) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Capability unavailable">
        <DConnectionError
          title="Capability unavailable"
          message="Capability information could not be loaded."
          detail={capabilityQuery.error.message}
          onRetry={() => void capabilityQuery.refetch()}
        />
      </AppDialog>
    );
  }

  if (!capabilityQuery.data) {
    return (
      <AppDialog kind="detail" open={open} onClose={onClose} title="Capability not found">
        <DEmptyState
          title="Capability not found"
          description="The requested capability record does not exist or is no longer available."
        />
      </AppDialog>
    );
  }

  const capability = capabilityQuery.data;

  async function handleTransition(targetStatus: CapabilityStatus, reason: string) {
    await statusTransition.mutateAsync({
      capabilityId: capability.id,
      targetStatus,
      reason,
    });
  }

  return (
    <>
      <AppDialog kind="detail"
        open={open}
        onClose={onClose}
        title={capability.name}
        status={<CapabilityStatusBadge status={capability.status} />}
        identifier={capability.code}
        footer={
          <DialogActions
            destructive={<CapabilityLifecycleAction capability={capability} isSubmitting={statusTransition.isPending} onTransition={handleTransition} />}
            secondary={<AppAction tone="secondary" onClick={onClose}>Close</AppAction>}
            primary={<AppAction onClick={() => setIsEditDialogOpen(true)}>Edit</AppAction>}
          />
        }
      >
        <DialogSection title="Capability">
          <DetailList>
            <DetailItem label="Capability name">{capability.name}</DetailItem>
            <DetailItem label="Capability code"><code className="capability-code">{capability.code}</code></DetailItem>
            <DetailItem label="Status"><CapabilityStatusBadge status={capability.status} /></DetailItem>
            <DetailItem wide label="Description">{capability.description}</DetailItem>
          </DetailList>
        </DialogSection>
        <DialogSection title="Record">
          <DetailList>
            <DetailItem label="Created">{formatDate(capability.createdAt)}</DetailItem>
            <DetailItem label="Updated">{formatDate(capability.updatedAt)}</DetailItem>
          </DetailList>
        </DialogSection>
      </AppDialog>
      <CapabilityFormDialog
        open={isEditDialogOpen}
        mode="edit"
        capability={capability}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
}

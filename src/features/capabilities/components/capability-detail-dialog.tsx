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
      <DDialog open={open} onClose={onClose} title="Capability details" size="lg">
        <div className="capability-page-state">
          <DLoadingIndicator label="Loading capability detail" />
        </div>
      </DDialog>
    );
  }

  if (capabilityQuery.isError) {
    return (
      <DDialog open={open} onClose={onClose} title="Capability unavailable" size="lg">
        <DConnectionError
          title="Capability unavailable"
          message="Capability information could not be loaded."
          detail={capabilityQuery.error.message}
          onRetry={() => void capabilityQuery.refetch()}
        />
      </DDialog>
    );
  }

  if (!capabilityQuery.data) {
    return (
      <DDialog open={open} onClose={onClose} title="Capability not found" size="lg">
        <DEmptyState
          title="Capability not found"
          description="The requested capability record does not exist or is no longer available."
        />
      </DDialog>
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
      <DDialog
        open={open}
        onClose={onClose}
        size="lg"
        title={capability.name}
        description={<code className="capability-code">{capability.code}</code>}
        footer={
          <div className="capability-dialog-actions">
            <DButton variant="outline" onClick={onClose}>
              Close
            </DButton>
            <DButton variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              Edit Capability
            </DButton>
            <CapabilityLifecycleAction
              capability={capability}
              isSubmitting={statusTransition.isPending}
              onTransition={handleTransition}
            />
          </div>
        }
      >
        <DCard variant="outlined">
          <DCardContent>
            <dl className="capability-overview-list">
              <div>
                <dt>Capability Name</dt>
                <dd>{capability.name}</dd>
              </div>
              <div>
                <dt>Capability Code</dt>
                <dd><code className="capability-code">{capability.code}</code></dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{capability.description ?? 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><CapabilityStatusBadge status={capability.status} /></dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(capability.createdAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(capability.updatedAt)}</dd>
              </div>
            </dl>
          </DCardContent>
        </DCard>
      </DDialog>
      <CapabilityFormDialog
        open={isEditDialogOpen}
        mode="edit"
        capability={capability}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
}

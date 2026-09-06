import { DButton, DDialog } from '@digvation-labs/ui';
import type { ClientListItem } from '../types/client';
import { ClientStatusBadge } from './client-status-badge';

function formatClientDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function ClientQuickDetailDialog({
  client,
  onClose,
  onOpenClient,
}: {
  client: ClientListItem | null;
  onClose: () => void;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <DDialog
      open={client !== null}
      onClose={onClose}
      title={client?.displayName ?? 'Client details'}
      description="A concise view of the current client record."
      footer={
        <div className="client-dialog-actions">
          <DButton variant="outline" onClick={onClose}>Close</DButton>
          {client ? <DButton onClick={() => onOpenClient(client.id)}>Open Client</DButton> : null}
        </div>
      }
    >
      {client ? (
        <dl className="client-quick-detail">
          <div><dt>Display Name</dt><dd>{client.displayName}</dd></div>
          <div><dt>Legal Name</dt><dd>{client.legalName ?? 'Not recorded'}</dd></div>
          <div><dt>Client Code</dt><dd><code className="client-code">{client.code}</code></dd></div>
          <div><dt>Status</dt><dd><ClientStatusBadge status={client.status} /></dd></div>
          <div><dt>Products</dt><dd>{client.productCount}</dd></div>
          <div><dt>Updated</dt><dd>{formatClientDate(client.updatedAt)}</dd></div>
        </dl>
      ) : null}
    </DDialog>
  );
}

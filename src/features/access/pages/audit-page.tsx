import { DDataTable, DEmptyState, type TableColumn } from '@digvation/ui';
import { formatInstant } from '../../../shared/format/date';
import { labelFor } from '../../../shared/labels/labels';
import { Code, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import type { AuditItem } from '../access-api';
import { useAudit } from '../access-queries';

function describeMetadata(metadata: AuditItem['metadata']) {
  if (!metadata) return '—';
  return Object.entries(metadata)
    .map(([key, value]) => `${labelFor(key.toUpperCase())}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('; ');
}

const COLUMNS: TableColumn<AuditItem>[] = [
  { key: 'created_at', label: 'When', render: (item) => formatInstant(item.created_at) },
  { key: 'event', label: 'Event', render: (item) => labelFor(item.event) },
  {
    key: 'target_type',
    label: 'Target',
    render: (item) => (
      <span>
        {labelFor(item.target_type)} {item.target_id ? <Code>{item.target_id.slice(0, 8)}</Code> : null}
      </span>
    ),
  },
  { key: 'actor_user_id', label: 'Actor', render: (item) => (item.actor_user_id ? <Code>{item.actor_user_id.slice(0, 8)}</Code> : 'System') },
  { key: 'metadata', label: 'Details', render: (item) => describeMetadata(item.metadata) },
];

export function AuditPage() {
  const list = useListState({ limit: 50 });
  const audit = useAudit({ ...list.query, search: undefined });

  return (
    <Page>
      <PageHeader title="Access audit" description="Every change to users, roles and invitations, newest first." />
      <QueryState query={audit} label="audit events">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            onPageChange={list.setPage}
            onPageSizeChange={list.setLimit}
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            emptyMessage={<DEmptyState title="No audit events" description="Access changes appear here as they happen." />}
          />
        )}
      </QueryState>
    </Page>
  );
}

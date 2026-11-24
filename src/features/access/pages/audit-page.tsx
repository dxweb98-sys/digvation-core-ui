import { DDataTable, type TableColumn } from '@digvation/ui';
import { formatInstant } from '../../../shared/format/date';
import { labelFor } from '../../../shared/labels/labels';
import { Code, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import type { AuditItem } from '../access-api';
import { useAudit } from '../access-queries';

function describeMetadata(metadata: AuditItem['metadata']) { if (!metadata) return '—';
  return Object.entries(metadata)
    .map(([key, value]) => `${labelFor(key.toUpperCase())}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('; ');
}

const COLUMNS: TableColumn<AuditItem>[] = [
  { key: 'created_at', label: 'Waktu', width: '190px', render: (item) => <span className="app-nowrap">{formatInstant(item.created_at)}</span> },
  { key: 'event', label: 'Event', render: (item) => labelFor(item.event) },
  { key: 'target_type',
    label: 'Target',
    render: (item) => (
      <span>
        {labelFor(item.target_type)} {item.target_id ? <Code>{item.target_id.slice(0, 8)}</Code> : null}
      </span>
    ) },
  { key: 'actor_user_id', label: 'Pelaku', render: (item) => (item.actor_user_id ? <Code>{item.actor_user_id.slice(0, 8)}</Code> : 'Sistem') },
  { key: 'metadata', label: 'Detail', render: (item) => describeMetadata(item.metadata) },
];

export function AuditPage() { const list = useListState({ limit: 50 });
  const audit = useAudit({ ...list.query, search: undefined });

  return (
    <Page>
      <PageHeader title="Access audit" description="Semua perubahan pada user, role, dan undangan; terbaru lebih dulu." />
      <QueryState query={audit} label="event audit">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            onPageChange={list.setPage}
            onPageSizeChange={list.setLimit}
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            emptyMessage="Belum ada event audit. Perubahan akses muncul di sini saat terjadi."
          />
        )}
      </QueryState>
    </Page>
  );
}

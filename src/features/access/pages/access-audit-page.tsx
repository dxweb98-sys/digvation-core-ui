import { DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, type TableColumn } from '@digvation/ui';
import { ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { labelFor } from '../../../shared/labels/labels';
import { isForbiddenError } from '../../../shared/http/core-api-client';
import { AppAction } from '../../../shared/ui/app-action';
import { AppDialog, DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { AppSelect } from '../../../shared/ui/form-fields';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { RecordButton } from '../../../shared/ui/record-button';
import { PermissionSummary } from '../components/permission-summary';
import { useAccessAuditRecords, useAccessUsers } from '../hooks/use-access';
import {
  ACCESS_AUDIT_EVENTS,
  ACCESS_AUDIT_TARGET_TYPES,
  formatAccessDate,
  type AccessAuditRecord,
  type AccessUser,
} from '../types/access';
import '../access.css';

const DEFAULT_PAGE_SIZE = 10;
const shortId = (id: string) => id.slice(0, 8);

const ALL = (label: string) => ({ value: '', label });
const EVENT_OPTIONS = [ALL('All events'), ...ACCESS_AUDIT_EVENTS.map(value => ({ value, label: labelFor(value) }))];
const TARGET_OPTIONS = [ALL('All target types'), ...ACCESS_AUDIT_TARGET_TYPES.map(value => ({ value, label: labelFor(value) }))];

function actorName(record: AccessAuditRecord, users: readonly AccessUser[]) {
  if (!record.actorUserId) return null;
  return users.find(user => user.id === record.actorUserId)?.name ?? `User ${shortId(record.actorUserId)}`;
}

/** An audit record cannot be filled in later, so an empty actor is "not recorded", not "not set". */
function ActorCell({ record, users }: { record: AccessAuditRecord; users: readonly AccessUser[] }) {
  return <>{actorName(record, users) ?? <span className="not-set">Not recorded</span>}</>;
}

function targetName(record: AccessAuditRecord, users: readonly AccessUser[]) {
  if (record.roleSlug) return record.roleSlug;
  if (!record.targetId) return null;
  const user = record.targetType === 'user' ? users.find(item => item.id === record.targetId) : undefined;
  return user?.name ?? shortId(record.targetId);
}

function SlugList({ label, slugs, mark }: { label: string; slugs: readonly string[]; mark?: { sign: string; className: string } }) {
  return <section aria-label={label}>
    <h4>{label}</h4>
    <ul>{slugs.map(slug => <li key={slug}>{mark ? <span aria-hidden="true" className={mark.className}>{mark.sign}</span> : null}{slug}</li>)}</ul>
  </section>;
}

function AuditChanges({ record }: { record: AccessAuditRecord }) {
  if (record.previousRoleSlugs && record.roleSlugs) {
    const added = record.roleSlugs.filter(slug => !record.previousRoleSlugs?.includes(slug));
    const removed = record.previousRoleSlugs.filter(slug => !record.roleSlugs?.includes(slug));
    if (!added.length && !removed.length) return <p className="access-secondary">No role assignment changes recorded.</p>;
    return <div className="access-change-groups">
      {added.length > 0 && <SlugList label="Added" slugs={added} mark={{ sign: '+', className: 'access-added' }} />}
      {removed.length > 0 && <SlugList label="Removed" slugs={removed} mark={{ sign: '−', className: 'access-removed' }} />}
    </div>;
  }
  if (record.permissionSlugs) return <PermissionSummary permissions={record.permissionSlugs} />;
  if (record.roleSlugs) return <div className="access-change-groups"><SlugList label="Roles" slugs={record.roleSlugs} /></div>;
  return <p className="access-secondary">No additional details recorded.</p>;
}

function AuditRecordDialog({ record, users, onClose }: { record: AccessAuditRecord; users: readonly AccessUser[]; onClose: () => void }) {
  const target = targetName(record, users);
  return <AppDialog kind="detail" open onClose={onClose} title={labelFor(record.event)} meta={target ?? undefined} footer={<div className="access-actions"><AppAction tone="secondary" onClick={onClose}>Close</AppAction></div>}>
    <div className="access-detail-content">
      <section className="access-section" aria-labelledby="access-audit-event-title">
        <h3 id="access-audit-event-title">Event details</h3>
        <DetailList>
          <DetailItem label="Time">{formatAccessDate(record.createdAt)}</DetailItem>
          <DetailItem label="Actor"><ActorCell record={record} users={users} /></DetailItem>
          <DetailItem label="Target type">{labelFor(record.targetType)}</DetailItem>
          <DetailItem label="Target">{valueOrNotSet(target)}</DetailItem>
          {record.expiresAt ? <DetailItem label="Expires">{formatAccessDate(record.expiresAt)}</DetailItem> : null}
        </DetailList>
      </section>
      <section className="access-section" aria-labelledby="access-audit-changes-title">
        <h3 id="access-audit-changes-title">Changes</h3>
        <AuditChanges record={record} />
      </section>
    </div>
  </AppDialog>;
}

/** Core-mode audit. Paging and filtering happen in CORE, so nothing here narrows a loaded page. */
export function AccessAuditPage() {
  const [event, setEvent] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<AccessAuditRecord | null>(null);
  const audit = useAccessAuditRecords({
    page,
    limit: pageSize,
    event: event || undefined,
    targetType: targetType || undefined,
    actorUserId: actorUserId || undefined,
  });
  // Names are a nicety: reading users needs its own permission, so a failure only hides them.
  const users = useAccessUsers();
  const userList = users.data ?? [];

  const changeFilter = (apply: (value: string) => void) => (value: string | number | null) => {
    apply(String(value ?? ''));
    setPage(1);
  };

  const columns: TableColumn<AccessAuditRecord>[] = [
    { key: 'createdAt', label: 'Time', render: record => <span className="access-audit-time"><RecordButton>{formatAccessDate(record.createdAt)}</RecordButton></span> },
    { key: 'event', label: 'Event', render: record => labelFor(record.event) },
    { key: 'actorUserId', label: 'Actor', render: record => <ActorCell record={record} users={userList} /> },
    { key: 'targetId', label: 'Target', render: record => <div className="access-id"><div>{valueOrNotSet(targetName(record, userList))}</div><span>{labelFor(record.targetType)}</span></div> },
  ];

  const header = <div>
    <h1>Access audit</h1>
    <p className="access-audit-scope">Access and permission changes: roles, role assignments and invitations.</p>
  </div>;

  if (isForbiddenError(audit.error)) {
    return <div className="access-page">{header}
      <DEmptyState
        icon={<ShieldOff aria-hidden="true" size={24} />}
        title="You don't have access to the access audit"
        description="Ask an administrator to add the Audit read permission, under Authorization, to your role."
      />
    </div>;
  }

  return <div className="access-page">{header}
    {audit.isPending ? <DLoadingIndicator label="Loading access audit" />
      : audit.isError ? <DConnectionError title="Access audit unavailable" message="Access audit records could not be loaded." detail={audit.error.message} onRetry={() => { void audit.refetch(); }} />
      : <DDataTable
        columns={columns}
        data={audit.data.items}
        rowKey="id"
        loading={audit.isPlaceholderData}
        onRowClick={setSelected}
        pagination={{ page, pageSize, total: audit.data.total }}
        onPageChange={setPage}
        onPageSizeChange={size => { setPageSize(size); setPage(1); }}
        emptyMessage={event || targetType || actorUserId
          ? <DEmptyState title="No matching records" description="Try another filter." />
          : <DEmptyState title="No access changes yet" description="Role, permission and invitation changes will appear here." />}
        filters={<div className="access-audit-filters">
          <AppSelect clearable={false} label="Event" value={event} options={EVENT_OPTIONS} onValueChange={changeFilter(setEvent)} />
          <AppSelect clearable={false} label="Target type" value={targetType} options={TARGET_OPTIONS} onValueChange={changeFilter(setTargetType)} />
          {userList.length > 0 && <AppSelect clearable={false} label="Actor" value={actorUserId} options={[ALL('All actors'), ...userList.map(user => ({ value: user.id, label: user.name }))]} onValueChange={changeFilter(setActorUserId)} />}
        </div>}
      />}
    {selected && <AuditRecordDialog record={selected} users={userList} onClose={() => setSelected(null)} />}
  </div>;
}

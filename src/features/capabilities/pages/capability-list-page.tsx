import {
  DButton,
  DConnectionError,
  DDataTable,
  DEmptyState,
  DLoadingIndicator,
  DStatusFilter,
  type TableAction,
  type TableColumn,
} from '@digvation/ui';
import { useState } from 'react';
import { CapabilityDetailDialog } from '../components/capability-detail-dialog';
import { CapabilityFormDialog } from '../components/capability-form-dialog';
import { CapabilityStatusBadge } from '../components/capability-status-badge';
import { useCapabilityList } from '../hooks/use-capability-list';
import type {
  Capability,
  CapabilityListQuery,
  CapabilityStatus,
} from '../types/capability';
import '../capabilities.css';

const PAGE_LIMIT = 10;
const CAPABILITY_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETIRED', label: 'Retired' },
];

const CAPABILITY_COLUMNS: TableColumn<Capability>[] = [
  {
    key: 'name',
    label: 'Capability',
    render: (capability) => (
      <div className="capability-table-identity">
        <strong>{capability.name}</strong>
        <span>{capability.description ?? 'No description recorded'}</span>
      </div>
    ),
  },
  {
    key: 'code',
    label: 'Code',
    render: (capability) => (
      <code className="capability-code">{capability.code}</code>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (capability) => <CapabilityStatusBadge status={capability.status} />,
  },
  {
    key: 'updatedAt',
    label: 'Updated',
    render: (capability) => formatCapabilityDate(capability.updatedAt),
  },
];

function formatCapabilityDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function CapabilityListPage() {
  const [query, setQuery] = useState<CapabilityListQuery>({
    search: '',
    status: 'ALL',
    page: 1,
    limit: PAGE_LIMIT,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [detailCapabilityId, setDetailCapabilityId] = useState<string | null>(null);
  const [editCapability, setEditCapability] = useState<Capability | null>(null);
  const capabilityQuery = useCapabilityList(query);

  function updateQuery(nextQuery: Partial<CapabilityListQuery>) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      ...nextQuery,
      page:
        nextQuery.page ??
        (nextQuery.search !== undefined || nextQuery.status !== undefined
          ? 1
          : currentQuery.page),
    }));
  }

  if (capabilityQuery.isPending) {
    return (
      <div className="capability-page-state">
        <DLoadingIndicator label="Loading capabilities" />
      </div>
    );
  }

  if (capabilityQuery.isError) {
    return (
      <div className="capability-page-state">
        <DConnectionError
          title="Capability catalog unavailable"
          message="Capability records could not be loaded from the selected data source."
          detail={capabilityQuery.error.message}
          isRetrying={capabilityQuery.isFetching}
          onRetry={() => void capabilityQuery.refetch()}
        />
      </div>
    );
  }

  const result = capabilityQuery.data;
  const tableActions: TableAction<Capability>[] = [
    {
      label: 'Quick Detail',
      onClick: (capability) => setDetailCapabilityId(capability.id),
    },
    { label: 'Edit Capability', onClick: setEditCapability },
  ];

  return (
    <div className="capabilities-page">
      <div className="capabilities-page-heading">
        <div>
          <p className="page-eyebrow">Reusable capability catalog</p>
          <h1>Capabilities</h1>
          <p>
            Manage reusable business capabilities independently from Product compatibility and Client entitlement.
          </p>
        </div>
      </div>

      <DDataTable
        columns={CAPABILITY_COLUMNS}
        data={result.capabilities}
        rowKey="id"
        searchable
        searchPlaceholder="Search capability name, description, or code"
        searchValue={query.search}
        onSearchChange={(search) => updateQuery({ search })}
        filters={
          <DStatusFilter
            label="Status"
            allLabel="All statuses"
            options={CAPABILITY_STATUS_OPTIONS}
            value={query.status}
            onChange={(status) =>
              updateQuery({ status: status as CapabilityStatus | 'ALL' })
            }
          />
        }
        headerActions={
          <DButton onClick={() => setIsCreateDialogOpen(true)}>
            Add Capability
          </DButton>
        }
        pagination={{
          page: query.page,
          pageSize: query.limit,
          total: result.total,
        }}
        onPageChange={(page) => updateQuery({ page })}
        onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })}
        emptyMessage={
          <DEmptyState
            title="No capabilities found"
            description="Try another search or status filter, or add the first reusable capability."
          />
        }
        onRowClick={(capability) => setDetailCapabilityId(capability.id)}
        actions={tableActions}
      />

      <CapabilityFormDialog
        open={isCreateDialogOpen}
        mode="create"
        onClose={() => setIsCreateDialogOpen(false)}
      />
      <CapabilityFormDialog
        open={editCapability !== null}
        mode="edit"
        capability={editCapability ?? undefined}
        onClose={() => setEditCapability(null)}
      />
      {detailCapabilityId ? (
        <CapabilityDetailDialog
          capabilityId={detailCapabilityId}
          open
          onClose={() => setDetailCapabilityId(null)}
        />
      ) : null}
    </div>
  );
}

import {
  DBreadcrumb,
  DBreadcrumbItem,
  DBreadcrumbLink,
  DBreadcrumbList,
  DBreadcrumbSeparator,
  DCard,
  DCardContent,
  DConnectionError,
  DSeparator,
} from '@digvation/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { errorReference, friendlyErrorMessage } from '../api/error-messages';
import { ContentSkeleton } from './content-skeleton';
import './page.css';

export function Page({ children }: { children: ReactNode }) {
  return <div className="app-page">{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="app-page-header">
      <div className="app-page-heading">
        <h1>{title}</h1>
        {meta ? <div className="app-page-meta">{meta}</div> : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="app-page-actions">{actions}</div> : null}
    </div>
  );
}

/**
 * Where a record sits: the trail is the design system breadcrumb, so the parent
 * stays one click away without repeating its label as a second back link.
 */
export type BreadcrumbTrailItem = { label: string; to?: string };

export function PageBreadcrumb({ trail }: { trail: BreadcrumbTrailItem[] }) {
  return (
    <DBreadcrumb>
      <DBreadcrumbList>
        {trail.map((crumb, index) => (
          <DBreadcrumbItem key={`${crumb.to ?? 'current'}-${crumb.label}`}>
            {index > 0 ? <DBreadcrumbSeparator /> : null}
            {crumb.to ? (
              <Link className="app-quiet-link" to={crumb.to}>
                {crumb.label}
              </Link>
            ) : (
              <DBreadcrumbLink active>{crumb.label}</DBreadcrumbLink>
            )}
          </DBreadcrumbItem>
        ))}
      </DBreadcrumbList>
    </DBreadcrumb>
  );
}

/**
 * Filled facts of one record in a dense grid. Empty values are left out
 * instead of taking a row each; when nothing is filled, `emptyLabel` says so.
 */
export type FieldItem = { label: string; value?: ReactNode | null };

export function FieldGrid({ items, emptyLabel = 'Belum ada yang tercatat.' }: { items: FieldItem[]; emptyLabel?: string }) {
  const filled = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  if (filled.length === 0) return <p className="app-field-grid-empty">{emptyLabel}</p>;
  return (
    <DCard variant="outlined" className="app-card">
      <DCardContent>
        <dl className="app-field-grid">
          {filled.map((item) => (
            <div className="app-field" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </DCardContent>
    </DCard>
  );
}

/**
 * Counts and totals of a record as one quiet card, not a card per number.
 * Items that are zero or absent are dropped by the caller with `show`.
 */
export type StatItem = { label: string; value: ReactNode; show?: boolean };

export function StatStrip({ items, emptyLabel }: { items: StatItem[]; emptyLabel?: string }) {
  const shown = items.filter((item) => item.show !== false);
  if (shown.length === 0) {
    return emptyLabel ? <p className="app-field-grid-empty">{emptyLabel}</p> : null;
  }
  return (
    <DCard variant="outlined" className="app-card">
      <DCardContent>
        <dl className="app-stat-strip">
          {shown.map((item, index) => (
            <Fragment key={item.label}>
              {index > 0 ? (
                <div className="app-stat-divider">
                  <DSeparator orientation="vertical" />
                </div>
              ) : null}
              <div className="app-stat">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            </Fragment>
          ))}
        </dl>
      </DCardContent>
    </DCard>
  );
}

/**
 * Content of one tab. The design system draws the tab bar; the separator and
 * the gap below it keep the panel visually detached from that bar.
 */
export function TabPanel({ children }: { children: ReactNode }) {
  return (
    <div className="app-tab-panel">
      <DSeparator />
      <div className="app-tab-panel-body">{children}</div>
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="app-section">
      <div className="app-section-header">
        <h2>{title}</h2>
        {actions ? <div className="app-page-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ErrorState({
  title,
  error,
  onRetry,
  retrying,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="app-page-state">
      <DConnectionError
        title={title}
        message={friendlyErrorMessage(error)}
        detail={errorReference(error)}
        isRetrying={retrying}
        onRetry={onRetry}
      />
    </div>
  );
}

/** Loading and failure for one query; children render only with data. */
export function QueryState<T>({
  query,
  label,
  children,
}: {
  query: UseQueryResult<T>;
  label: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <ContentSkeleton label={`Memuat ${label}`} />;
  if (query.isError) {
    return (
      <ErrorState
        title={`${label.charAt(0).toUpperCase()}${label.slice(1)} tidak tersedia`}
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <>{children(query.data)}</>;
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="app-code">{children}</code>;
}

/** Primary and secondary text in one table cell. */
export function Identity({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="app-identity">
      <strong>{primary}</strong>
      {secondary ? <span>{secondary}</span> : null}
    </div>
  );
}

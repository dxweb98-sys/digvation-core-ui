import { DConnectionError } from '@digvation/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
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
  if (query.isPending) return <ContentSkeleton label={`Loading ${label}`} />;
  if (query.isError) {
    return (
      <ErrorState
        title={`${label.charAt(0).toUpperCase()}${label.slice(1)} unavailable`}
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

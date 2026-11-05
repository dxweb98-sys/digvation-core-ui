import type { ReactNode } from 'react';
import { isCoreMode } from '../data/data-availability';
import './not-connected.css';

export const NOT_CONNECTED_TITLE = 'Not connected yet';

export function NotConnected({ description, heading }: { description: string; heading?: string }) {
  return (
    <div className="not-connected">
      {heading ? <h2>{heading}</h2> : null}
      <strong>{NOT_CONNECTED_TITLE}</strong>
      <p>{description}</p>
    </div>
  );
}

/** Renders its children only where they have a real data source. */
export function ConnectedOnly({
  children,
  description,
  heading,
  pageTitle,
}: {
  children: ReactNode;
  description: string;
  heading?: string;
  pageTitle?: string;
}) {
  if (!isCoreMode()) return <>{children}</>;
  if (!pageTitle) return <NotConnected description={description} heading={heading} />;
  return (
    <div className="not-connected-page">
      <h1>{pageTitle}</h1>
      <NotConnected description={description} />
    </div>
  );
}

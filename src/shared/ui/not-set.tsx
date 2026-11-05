import type { ReactNode } from 'react';
import './not-set.css';

/**
 * Empty-value rule: an optional field an operator can fill shows "Not set", muted.
 * Without a label beside it, the field is named ("Legal name not set"). A field that
 * does not apply to the current mode is hidden instead.
 */
export function NotSet({ field }: { field?: string }) {
  return <span className="not-set">{field ? `${field} not set` : 'Not set'}</span>;
}

export function isEmptyValue(value: ReactNode): boolean {
  return value === null || value === undefined || value === '';
}

export function valueOrNotSet(value: ReactNode, field?: string): ReactNode {
  return isEmptyValue(value) ? <NotSet field={field} /> : value;
}

import type { ReactNode } from 'react';
import './not-set.css';

/**
 * Empty-value rule: an optional field an operator can fill shows "Belum diisi", muted.
 * Without a label beside it, the field is named ("Legal name belum diisi"). A field that
 * does not apply to the current mode is hidden instead.
 */
export function NotSet({ field }: { field?: string }) {
  return <span className="not-set">{field ? `${field} belum diisi` : 'Belum diisi'}</span>;
}

export function isEmptyValue(value: ReactNode): boolean {
  return value === null || value === undefined || value === '';
}

export function valueOrNotSet(value: ReactNode, field?: string): ReactNode {
  return isEmptyValue(value) ? <NotSet field={field} /> : value;
}

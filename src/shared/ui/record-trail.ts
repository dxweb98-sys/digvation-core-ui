import { createContext, useContext, useEffect } from 'react';
import type { BreadcrumbTrailItem } from './page';

export interface RecordTrailValue {
  trail: BreadcrumbTrailItem[] | null;
  setTrail: (trail: BreadcrumbTrailItem[] | null) => void;
}

/**
 * The header breadcrumb of a record page names its records ("Klien / Poseidon
 * Filter / POSEIDON"), which the path alone cannot. The shell provides and reads
 * it; a page sets it with useRecordTrail while it is shown.
 */
export const RecordTrailContext = createContext<RecordTrailValue | null>(null);

export function useRecordTrailValue() {
  return useContext(RecordTrailContext)?.trail ?? null;
}

/** Sets the header breadcrumb while the page is shown; `null` keeps the menu trail. */
export function useRecordTrail(trail: BreadcrumbTrailItem[] | null) {
  const setTrail = useContext(RecordTrailContext)?.setTrail;
  const key = trail ? JSON.stringify(trail) : '';
  useEffect(() => {
    if (!setTrail) return;
    setTrail(key ? (JSON.parse(key) as BreadcrumbTrailItem[]) : null);
    return () => setTrail(null);
  }, [key, setTrail]);
}

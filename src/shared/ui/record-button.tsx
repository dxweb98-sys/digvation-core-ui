import type { ReactNode } from 'react';
import './record-button.css';

/**
 * Keyboard route into a table row. It has no handler of its own: Enter and
 * Space fire a click that bubbles to the row's onRowClick, so it always opens
 * the same record as a mouse click on the row.
 */
export function RecordButton({ children }: { children: ReactNode }) {
  return (
    <button className="record-button" type="button">
      {children}
    </button>
  );
}

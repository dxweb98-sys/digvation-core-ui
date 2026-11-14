import { fireEvent, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * DDataTable row-action triggers. The design system renders them without a
 * button role, so tests find them by their component marker.
 */
export function rowActionTriggers() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-ds-component="dropdown-trigger"]'),
  ).filter((trigger) => trigger.querySelectorAll('circle').length === 3);
}

export async function openRowActions(index: number) {
  await waitFor(() => expect(rowActionTriggers().length).toBeGreaterThan(index));
  const trigger = rowActionTriggers()[index];
  fireEvent.click(trigger.firstElementChild ?? trigger);
}

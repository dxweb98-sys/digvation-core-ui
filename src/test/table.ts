import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

/** Picks an option in a DSelectFilter of the DDataTable filter section. */
export async function chooseFilter(label: string, option: string | RegExp) {
  // The list may still be open from the previous choice; clicking would close it.
  if (!screen.queryAllByRole('option').length) openFilter(label);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

/** Opens a DSelectFilter (not a column header of the same name). */
export function openFilter(label: string) {
  const filter = Array.from(document.querySelectorAll<HTMLElement>('[data-ds-component="select-filter"]')).find(
    (element) => element.querySelector('label')?.textContent === label,
  );
  if (!filter) throw new Error(`No filter labelled ${label}`);
  fireEvent.click(within(filter).getByRole('button', { name: label }));
}

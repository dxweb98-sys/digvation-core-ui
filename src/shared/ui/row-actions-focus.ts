/**
 * Closes a row dialog and puts focus back on that row's ⋯ button (marked with
 * `data-row-actions={id}`). DDataTable renders each row twice — desktop table
 * and mobile card — so the visible button is used.
 */
export function closeAndRefocus(rowId: string | undefined, close: () => void) {
  close();
  if (!rowId) return;
  requestAnimationFrame(() =>
    [...document.querySelectorAll<HTMLElement>(`[data-row-actions="${rowId}"]`)]
      .find((button) => button.offsetParent !== null)
      ?.focus(),
  );
}

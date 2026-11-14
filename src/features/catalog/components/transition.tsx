import type { TableAction } from '@digvation/ui';
import { useState } from 'react';
import { ConfirmDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { transitionLabel } from '../../../shared/labels/labels';

const DESTRUCTIVE = new Set(['RETIRED', 'WITHDRAWN', 'ARCHIVED', 'CANCELLED', 'ENDED']);

const RELEASE_LABELS: Record<string, string> = { RELEASED: 'Release', WITHDRAWN: 'Withdraw', ACTIVE: 'Activate' };

export function targetLabel(target: string) {
  return RELEASE_LABELS[target] ?? transitionLabel(target);
}

/**
 * Lifecycle moves for table rows: one action per reachable status, then a
 * confirmation that records the reason CORE requires.
 */
export function useTransitions<T extends { status: string }>({
  transitions,
  name,
  describe,
  apply,
}: {
  transitions: Record<string, readonly string[]>;
  name: (row: T) => string;
  describe?: (row: T, target: string) => string;
  apply: (row: T, target: string, reason: string) => Promise<unknown>;
}) {
  const [pending, setPending] = useState<{ row: T; target: string } | null>(null);
  const targets = Array.from(new Set(Object.values(transitions).flat()));

  const actions: TableAction<T>[] = targets.map((target) => ({
    label: targetLabel(target),
    variant: DESTRUCTIVE.has(target) ? ('danger' as const) : ('default' as const),
    show: (row: T) => (transitions[row.status] ?? []).includes(target),
    onClick: (row: T) => setPending({ row, target }),
  }));

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending ? `${targetLabel(pending.target)} ${name(pending.row)}` : ''}
      message={
        pending
          ? (describe?.(pending.row, pending.target) ??
            `${name(pending.row)} moves to ${transitionLabel(pending.target).toLowerCase()}.`)
          : ''
      }
      confirmLabel={pending ? targetLabel(pending.target) : ''}
      tone={pending && DESTRUCTIVE.has(pending.target) ? 'danger' : 'primary'}
      reason={{}}
      onConfirm={(values) => apply(pending!.row, pending!.target, read.text(values, 'reason'))}
      onClose={() => setPending(null)}
    />
  );

  return { actions, dialog, open: (row: T, target: string) => setPending({ row, target }) };
}

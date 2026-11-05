import { DToastProvider } from '@digvation/ui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClientCapabilitySummary } from '../types/client-capability';
import { ClientCapabilityLifecycleAction } from './client-capability-lifecycle-action';

const assignment = {
  id: 'assignment-1',
  status: 'PROVISIONING',
  capability: { id: 'capability-1', code: 'REPORTS', name: 'Reports' },
} as unknown as ClientCapabilitySummary;

describe('client capability status change', () => {
  it('requires a reason on the field before it changes the status', async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    render(
      <DToastProvider>
        <ClientCapabilityLifecycleAction
          assignment={assignment}
          canBecomeEffective
          isSubmitting={false}
          onTransition={onTransition}
        />
      </DToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Reports' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    const reason = within(dialog).getByRole('textbox', { name: /reason/i });
    await waitFor(() => expect(reason).toHaveAttribute('aria-invalid', 'true'));
    const describedBy = reason.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toHaveTextContent('Enter a reason.');
    expect(onTransition).not.toHaveBeenCalled();
  });
});

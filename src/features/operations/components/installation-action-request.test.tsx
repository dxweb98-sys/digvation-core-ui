import { DToastProvider } from '@digvation/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InstallationActionRequest } from './installation-action-request';

const action = {
  id: 'action-1',
  actionType: 'REDEPLOY',
  targetType: 'INSTALLATION',
  targetId: 'installation-1',
  requestedBy: 'Rani Pratama',
  reason: 'Contract ended',
  status: 'REQUESTED',
  requestedAt: '2026-11-05T01:00:00.000Z',
};

vi.mock('../hooks/use-operations', () => ({
  useActions: () => ({ data: [action] }),
  useActionRequest: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe('installation action history', () => {
  it('says plainly that a request has not run', () => {
    render(
      <DToastProvider>
        <InstallationActionRequest installationId="installation-1" installationName="Nova POS" />
      </DToastProvider>,
    );

    expect(screen.getAllByText('Not run yet').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('—');
  });
});

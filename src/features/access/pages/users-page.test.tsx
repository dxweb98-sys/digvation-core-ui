import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { openRowActions, rowActionTriggers } from '../../../test/table';
import { UsersPage } from './users-page';

const users = {
  items: [
    {
      id: 'user-2',
      fullname: 'Rina Ops',
      phone_number: null,
      email: 'rina@digvation.id',
      username: 'rina',
      is_active: true,
      email_verified_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      roles: ['SUPPORT'],
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

function serve(permissions: string[], onWrite?: (url: string, body: unknown) => Response) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: ['SUPPORT'], permissions });
    if (path === '/users') return envelope(users);
    if (path === '/roles') return envelope({ items: [] });
    if (onWrite && call.method !== 'GET') return onWrite(path, call.body);
    return failure(404, 'NOT_FOUND');
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('users page', () => {
  it('lists users from CORE and offers no row actions to a read-only operator', async () => {
    const { calls } = serve(['users.read']);
    renderApp(<UsersPage />);

    expect((await screen.findAllByText('Rina Ops')).length).toBeGreaterThan(0);
    await waitFor(() => expect(calls.some((call) => call.url.endsWith('/authorization/me'))).toBe(true));
    expect(rowActionTriggers()).toHaveLength(0);
  });

  it('deactivates with a reason and shows CORE’s refusal in Indonesian', async () => {
    const { calls } = serve(['users.read', 'users.lifecycle.manage'], () => failure(409, 'LAST_SUPER_ADMIN'));
    renderApp(<UsersPage />);

    await openRowActions(0);
    fireEvent.click(await screen.findByText('Nonaktifkan'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }));
    expect(await within(dialog).findByText('Isi kolom ini.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Left the company' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }));

    expect(await within(dialog).findByText(/minimal satu Super Admin/)).toBeInTheDocument();
    const write = calls.find((call) => call.method === 'PATCH');
    expect(write?.url).toContain('/users/user-2/status');
    expect(write?.body).toEqual({ is_active: false, reason: 'Left the company' });
  });
});

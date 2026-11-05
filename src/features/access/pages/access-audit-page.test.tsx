import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelFor } from '../../../shared/labels/labels';
import { ACCESS_AUDIT_EVENTS } from '../types/access';
import { AuditPage } from './access-pages';

vi.mock('../../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

const ACTOR = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  fullname: 'Rani Pratama',
  email: 'rani@example.test',
  is_active: true,
  roles: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const ROLE_CREATED = {
  id: 'audit-1',
  actor_user_id: ACTOR.id,
  event: 'ROLE_CREATED',
  target_type: 'role',
  target_id: 'role-1',
  metadata: { role_slug: 'SUPPORT_LEAD', permission_slugs: ['clients.read'] },
  created_at: '2026-11-05T01:00:00.000Z',
};
const USER_ROLES = {
  id: 'audit-2',
  actor_user_id: 'bbbbbbbb-0000-4000-8000-000000000002',
  event: 'USER_ROLES_UPDATED',
  target_type: 'user',
  target_id: ACTOR.id,
  metadata: { previous_role_slugs: ['MEMBER'], role_slugs: ['ADMIN', 'MEMBER'] },
  created_at: '2026-11-05T02:00:00.000Z',
};
const ACCEPTED = {
  id: 'audit-3',
  actor_user_id: null,
  event: 'INVITATION_ACCEPTED',
  target_type: 'user',
  target_id: 'cccccccc-0000-4000-8000-000000000003',
  metadata: { invitation_id: 'inv-1', role_slugs: ['MEMBER'] },
  created_at: '2026-11-05T03:00:00.000Z',
};

const fetchMock = vi.fn<typeof fetch>();
type Reply = { status: number; data?: unknown; message?: string };

function reply({ status, data, message }: Reply) {
  const body = status < 400 ? { success: true, data } : { success: false, error: { code: 'E', message } };
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function routeCore({ audit, users = { status: 200, data: { users: [ACTOR] } } }: { audit: (url: URL) => Reply; users?: Reply }) {
  fetchMock.mockImplementation(input => {
    const url = new URL(String(input));
    if (url.pathname === '/authorization/audit-logs') return Promise.resolve(reply(audit(url)));
    if (url.pathname === '/users') return Promise.resolve(reply(users));
    if (url.pathname === '/roles') return Promise.resolve(reply({ status: 200, data: { items: [] } }));
    return Promise.reject(new Error(`Unexpected request: ${url.pathname}`));
  });
}

function auditPage(items: unknown[], total = items.length): Reply {
  return { status: 200, data: { items, pagination: { page: 1, limit: 10, total, total_pages: Math.ceil(total / 10) } } };
}

function auditRequests() {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter(url => url.pathname === '/authorization/audit-logs');
}

function renderPage() {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><DToastProvider><AuditPage /></DToastProvider></QueryClientProvider>);
}

function filterPanel() {
  return document.querySelector('.access-audit-filters') as HTMLElement;
}

async function chooseFilter(label: string, option: string) {
  fireEvent.click(within(filterPanel()).getByRole('button', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('access audit labels', () => {
  it.each([
    ['ROLE_CREATED', 'Role created'],
    ['ROLE_UPDATED', 'Role updated'],
    ['ROLE_DEACTIVATED', 'Role deactivated'],
    ['ROLE_REACTIVATED', 'Role reactivated'],
    ['ROLE_PERMISSIONS_UPDATED', 'Role permissions updated'],
    ['USER_ROLES_UPDATED', 'User roles updated'],
    ['INVITATION_CREATED', 'Invitation created'],
    ['INVITATION_ACCEPTED', 'Invitation accepted'],
    ['INVITATION_REVOKED', 'Invitation revoked'],
    ['INVITATION_REVOKED_DELIVERY_FAILURE', 'Invitation delivery failed'],
    ['SUPER_ADMIN_ASSIGNED', 'Super Admin assigned'],
    ['role', 'Role'],
    ['user', 'User'],
    ['invitation', 'Invitation'],
  ])('labels %s', (code, label) => {
    expect(labelFor(code)).toBe(label);
  });

  it('filters by every event it labels', () => {
    expect(ACCESS_AUDIT_EVENTS).toHaveLength(11);
  });
});

describe('access audit page in core mode', () => {
  it('names itself after what it covers', async () => {
    routeCore({ audit: () => auditPage([ROLE_CREATED]) });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Access audit' })).toBeInTheDocument();
    expect(screen.getByText('Access and permission changes: roles, role assignments and invitations.')).toBeInTheDocument();
    await screen.findAllByText('Role created');
    expect(screen.queryByText('Not connected yet')).not.toBeInTheDocument();
  });

  it('shows a loading state until CORE answers', async () => {
    let answer: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation(input => {
      const url = new URL(String(input));
      if (url.pathname === '/authorization/audit-logs') return new Promise<Response>(resolve => { answer = resolve; });
      return Promise.resolve(reply({ status: 200, data: url.pathname === '/users' ? { users: [] } : { items: [] } }));
    });
    renderPage();

    expect(await screen.findByText('Loading access audit')).toBeInTheDocument();
    answer(reply(auditPage([ROLE_CREATED])));
    await screen.findAllByText('Role created');
    expect(screen.queryByText('Loading access audit')).not.toBeInTheDocument();
  });

  it('shows human labels, resolves actors it can name and marks a missing actor', async () => {
    routeCore({ audit: () => auditPage([ROLE_CREATED, USER_ROLES, ACCEPTED]) });
    renderPage();

    await screen.findAllByText('Role created');
    expect(screen.getAllByText('User roles updated').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invitation accepted').length).toBeGreaterThan(0);
    expect(screen.queryByText('ROLE_CREATED')).not.toBeInTheDocument();
    await screen.findAllByText('Rani Pratama');
    expect(screen.getAllByText('SUPPORT_LEAD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User bbbbbbbb').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
  });

  it('keeps an event CORE adds later readable', async () => {
    routeCore({ audit: () => auditPage([{ ...ROLE_CREATED, event: 'ROLE_ARCHIVED' }]) });
    renderPage();

    expect((await screen.findAllByText('Role archived')).length).toBeGreaterThan(0);
  });

  it('shows the empty state when nothing has been recorded', async () => {
    routeCore({ audit: () => auditPage([]) });
    renderPage();

    expect((await screen.findAllByText('No access changes yet')).length).toBeGreaterThan(0);
  });

  it('shows the no-permission state on 403, without an error or a retry loop', async () => {
    routeCore({ audit: () => ({ status: 403, message: 'Missing required permission' }) });
    renderPage();

    expect(await screen.findByText("You don't have access to the access audit")).toBeInTheDocument();
    expect(screen.queryByText('Access audit unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Not connected yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|try again|coba lagi/i })).not.toBeInTheDocument();
    expect(auditRequests()).toHaveLength(1);
  });

  it('shows a connection error with retry on any other failure', async () => {
    let failing = true;
    routeCore({ audit: () => (failing ? { status: 500, message: 'Unavailable' } : auditPage([ROLE_CREATED])) });
    renderPage();

    expect(await screen.findByText('Access audit unavailable', {}, { timeout: 5000 })).toBeInTheDocument();
    failing = false;
    fireEvent.click(screen.getByRole('button', { name: /retry|try again|coba lagi/i }));
    expect((await screen.findAllByText('Role created')).length).toBeGreaterThan(0);
  });

  it('still lists records when users cannot be read, and drops only the actor filter', async () => {
    routeCore({
      audit: () => auditPage([ROLE_CREATED]),
      users: { status: 403, message: 'Missing required permission' },
    });
    renderPage();

    await screen.findAllByText('Role created');
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/users')).length).toBe(2), { timeout: 5000 });
    expect(screen.getAllByText('User aaaaaaaa').length).toBeGreaterThan(0);
    expect(within(filterPanel()).getByRole('button', { name: 'Event' })).toBeInTheDocument();
    expect(within(filterPanel()).queryByRole('button', { name: 'Actor' })).not.toBeInTheDocument();
  });

  it('asks CORE to filter by event and target type and returns to page one', async () => {
    routeCore({ audit: () => auditPage([ROLE_CREATED], 25) });
    renderPage();
    await screen.findAllByText('Role created');

    fireEvent.click(screen.getByRole('button', { name: /^(page|halaman) 2$/i }));
    await waitFor(() => expect(auditRequests().at(-1)?.searchParams.get('page')).toBe('2'));

    await chooseFilter('Event', 'Role created');
    await waitFor(() => expect(auditRequests().at(-1)?.searchParams.get('event')).toBe('ROLE_CREATED'));
    expect(auditRequests().at(-1)?.searchParams.get('page')).toBe('1');

    await chooseFilter('Target type', 'Role');
    await waitFor(() => expect(auditRequests().at(-1)?.searchParams.get('target_type')).toBe('role'));

    await chooseFilter('Event', 'All events');
    await waitFor(() => expect(auditRequests().at(-1)?.searchParams.has('event')).toBe(false));
  });

  it('asks CORE to filter by actor', async () => {
    routeCore({ audit: () => auditPage([ROLE_CREATED]) });
    renderPage();
    await screen.findAllByText('Rani Pratama');

    await chooseFilter('Actor', 'Rani Pratama');

    await waitFor(() => expect(auditRequests().at(-1)?.searchParams.get('actor_user_id')).toBe(ACTOR.id));
  });

  it('says no records match when a filter empties the list', async () => {
    routeCore({ audit: url => auditPage(url.searchParams.get('event') ? [] : [ROLE_CREATED]) });
    renderPage();
    await screen.findAllByText('Role created');

    await chooseFilter('Event', 'Invitation revoked');

    expect((await screen.findAllByText('No matching records')).length).toBeGreaterThan(0);
    expect(screen.queryByText('No access changes yet')).not.toBeInTheDocument();
  });

  it('opens a record from the keyboard route and shows what changed', async () => {
    routeCore({ audit: () => auditPage([USER_ROLES]) });
    renderPage();
    await screen.findAllByText('User roles updated');

    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /2026/ }));

    const dialog = await screen.findByRole('dialog', { name: 'User roles updated' });
    expect(within(within(dialog).getByRole('region', { name: 'Added' })).getByText('ADMIN')).toBeInTheDocument();
    expect(within(dialog).queryByRole('region', { name: 'Removed' })).not.toBeInTheDocument();
  });

  it('says an empty actor was not recorded, in the row and in the detail', async () => {
    routeCore({ audit: () => auditPage([ACCEPTED]) });
    renderPage();
    await screen.findAllByText('Invitation accepted');

    const table = within(screen.getByRole('table'));
    expect(table.getByText('Not recorded')).toHaveClass('not-set');
    expect(table.queryByText('Not set')).not.toBeInTheDocument();

    fireEvent.click(table.getByRole('button', { name: /2026/ }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Invitation accepted' }));
    expect(dialog.getByText('Not recorded')).toBeInTheDocument();
    expect(dialog.queryByText('Not set')).not.toBeInTheDocument();
  });

  it('lists permissions for a role event', async () => {
    routeCore({ audit: () => auditPage([ROLE_CREATED]) });
    renderPage();
    await screen.findAllByText('Role created');

    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /2026/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Role created' });
    expect(within(dialog).getByRole('region', { name: 'Clients' })).toHaveTextContent('Read');
  });
});

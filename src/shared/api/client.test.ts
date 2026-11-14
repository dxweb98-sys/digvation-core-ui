import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../test/fetch-mock';
import { ApiError } from './api-error';
import { AUTH_LOST_EVENT, api, apiUrl, login, logout } from './client';
import { clearCoreSessionTokens, getCoreAccessToken, getCoreCsrfToken } from './session';

const session = {
  access_token: 'access-1',
  token_type: 'Bearer',
  expires_in: 600,
  access_token_expires_at: '2026-11-14T00:10:00Z',
  refresh_token_expires_at: '2026-11-21T00:00:00Z',
  csrf_token: 'csrf-1',
  remember_me: false,
  user: { id: 'u1' },
};

beforeEach(() => clearCoreSessionTokens());
afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('unwraps the success envelope and keeps paged lists as items and pagination', async () => {
    const page = { items: [{ id: 'c1' }], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } };
    mockFetch(() => envelope(page));

    await expect(api.list('/clients', { page: 1 })).resolves.toEqual(page);
  });

  it('drops empty query values and encodes the rest', () => {
    expect(apiUrl('/clients', { search: 'a b', status: undefined, page: 2, empty: '' })).toBe(
      'http://localhost:4002/clients?search=a+b&page=2',
    );
  });

  it('turns the error envelope into an ApiError with code, details and request id', async () => {
    mockFetch(() =>
      failure(400, 'VALIDATION_ERROR', [{ field: 'code', reason: 'DUPLICATE_VALUE', message: 'code exists' }]),
    );

    const error = await api.post('/clients', {}).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'req-err',
      details: [{ field: 'code', reason: 'DUPLICATE_VALUE', message: 'code exists' }],
    });
  });

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.get('/clients')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('keeps the access token in memory and the CSRF token for the cookie refresh', async () => {
    const { calls } = mockFetch(() => envelope(session));

    await login({ identifier: 'ops', password: 'secret', remember_me: false });

    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://localhost:4002/auth/login' });
    expect(calls[0].headers.get('Authorization')).toBeNull();
    expect(getCoreAccessToken()).toBe('access-1');
    expect(getCoreCsrfToken()).toBe('csrf-1');
  });

  it('sends the bearer token, refreshes once on 401 with the CSRF header, then retries', async () => {
    mockFetch(() => envelope(session));
    await login({ identifier: 'ops', password: 'secret', remember_me: false });

    let clientsCalls = 0;
    const { calls } = mockFetch((call) => {
      if (call.url.endsWith('/auth/refresh')) return envelope({ ...session, access_token: 'access-2' });
      clientsCalls += 1;
      return clientsCalls === 1 ? failure(401, 'UNAUTHORIZED') : envelope({ ok: true });
    });

    await expect(api.get('/clients')).resolves.toEqual({ ok: true });
    expect(calls.map((call) => call.url.replace('http://localhost:4002', ''))).toEqual([
      '/clients',
      '/auth/refresh',
      '/clients',
    ]);
    expect(calls[0].headers.get('Authorization')).toBe('Bearer access-1');
    expect(calls[1].headers.get('X-CSRF-Token')).toBe('csrf-1');
    expect(calls[2].headers.get('Authorization')).toBe('Bearer access-2');
  });

  it('announces a lost session when the refresh is refused', async () => {
    mockFetch(() => envelope(session));
    await login({ identifier: 'ops', password: 'secret', remember_me: false });
    mockFetch((call) =>
      call.url.endsWith('/auth/refresh') ? failure(401, 'UNAUTHORIZED') : failure(401, 'UNAUTHORIZED'),
    );
    const lost = vi.fn();
    window.addEventListener(AUTH_LOST_EVENT, lost);

    await expect(api.get('/clients')).rejects.toMatchObject({ status: 401 });
    expect(lost).toHaveBeenCalledTimes(1);
    expect(getCoreAccessToken()).toBeNull();
    window.removeEventListener(AUTH_LOST_EVENT, lost);
  });

  it('logs out with the CSRF header and clears local tokens', async () => {
    mockFetch(() => envelope(session));
    await login({ identifier: 'ops', password: 'secret', remember_me: false });
    const { calls } = mockFetch(() => envelope({ message: 'ok' }));

    await logout();

    expect(calls[0].headers.get('X-CSRF-Token')).toBe('csrf-1');
    expect(getCoreAccessToken()).toBeNull();
    expect(getCoreCsrfToken()).toBeNull();
  });
});

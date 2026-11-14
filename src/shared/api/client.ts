import { applicationConfig } from '../config/application-config';
import { ApiError, type ApiErrorDetail } from './api-error';
import {
  clearCoreSessionTokens,
  getCoreAccessToken,
  getCoreCsrfToken,
  setCoreSessionTokens,
} from './session';
import type { Dto, Page } from './types';

export const AUTH_LOST_EVENT = 'digvation-core:auth-lost';

type AuthenticationResponse = Dto<'AuthenticationResponseDto'>;
export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** False for the public auth routes. */
  auth?: boolean;
}

let refreshPromise: Promise<AuthenticationResponse | null> | null = null;

export function apiUrl(path: string, query?: Query) {
  const base = applicationConfig.coreApiUrl.replace(/\/+$/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return `${base}${path.startsWith('/') ? path : `/${path}`}${search ? `?${search}` : ''}`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Success answers are `{ success: true, data, request_id, timestamp }`. */
function unwrap<T>(payload: unknown): T {
  const body = payload as { success?: unknown; data?: unknown } | null | undefined;
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data as T;
  }
  return payload as T;
}

function isDetail(item: unknown): item is ApiErrorDetail {
  return Boolean(item) && typeof item === 'object' && 'message' in (item as object);
}

/** Failures are `{ success: false, error: { code, message, details? }, request_id }`. */
export function toApiError(status: number, payload: unknown, fallback = 'Request failed') {
  const body = payload as
    | { request_id?: string; error?: { code?: string; message?: string; details?: unknown } }
    | undefined;
  const error = body && typeof body === 'object' ? body.error : undefined;
  return new ApiError(
    error?.message ?? fallback,
    status,
    error?.code as ApiError['code'],
    Array.isArray(error?.details) ? error.details.filter(isDetail) : [],
    body && typeof body === 'object' ? body.request_id : undefined,
  );
}

function notifyAuthLost() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_LOST_EVENT));
}

async function send(
  method: string,
  path: string,
  options: RequestOptions,
  mayRefresh: boolean,
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  let body: BodyInit | undefined;
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  if (options.auth !== false) {
    const token = getCoreAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0, 'NETWORK_ERROR');
  }

  if (response.status === 401 && options.auth !== false && mayRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) return send(method, path, options, false);
    clearCoreSessionTokens();
    notifyAuthLost();
  }
  return response;
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(method, path, options, true);
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload, response.statusText || undefined);
  return unwrap<T>(payload);
}

/** A file answer (invoice PDF, payment proof). Failures still arrive as the JSON envelope. */
export async function apiFile(path: string): Promise<{ blob: Blob; filename?: string }> {
  const response = await send('GET', path, {}, true);
  if (!response.ok) throw toApiError(response.status, await readJson(response));
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  return {
    blob: await response.blob(),
    filename: filename ? decodeURIComponent(filename) : undefined,
  };
}

export const api = {
  get: <T>(path: string, query?: Query) => apiRequest<T>('GET', path, { query }),
  /** Paged lists answer `data: { items, pagination }`. */
  list: <T>(path: string, query?: Query) => apiRequest<Page<T>>('GET', path, { query }),
  post: <T>(path: string, body: unknown = {}) => apiRequest<T>('POST', path, { body }),
  put: <T>(path: string, body: unknown) => apiRequest<T>('PUT', path, { body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>('PATCH', path, { body }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>('DELETE', path, { body }),
  upload: <T>(path: string, file: File, field = 'file') => {
    const form = new FormData();
    form.append(field, file);
    return apiRequest<T>('POST', path, { body: form });
  },
};

/** Encodes one path segment. */
export function seg(value: string) {
  return encodeURIComponent(value);
}

function storeSession(result: AuthenticationResponse) {
  setCoreSessionTokens({
    accessToken: result.access_token,
    csrfToken: result.csrf_token,
    rememberMe: result.remember_me,
  });
}

export async function login(input: Dto<'LoginDto'>) {
  const result = await apiRequest<AuthenticationResponse>('POST', '/auth/login', {
    body: input,
    auth: false,
  });
  storeSession(result);
  return result;
}

/** Cookie refresh: the HttpOnly refresh cookie plus the CSRF token it was issued with. */
export function refreshSession(): Promise<AuthenticationResponse | null> {
  const csrfToken = getCoreCsrfToken();
  if (!csrfToken) return Promise.resolve(null);
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: '{}',
      });
      if (!response.ok) {
        clearCoreSessionTokens();
        return null;
      }
      const result = unwrap<AuthenticationResponse>(await readJson(response));
      storeSession(result);
      return result;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/** Revokes the refresh session; the local tokens are cleared whatever CORE answers. */
export async function logout() {
  const csrfToken = getCoreCsrfToken();
  try {
    if (csrfToken) {
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: '{}',
      });
    }
  } catch {
    // The session is dropped locally either way.
  } finally {
    clearCoreSessionTokens();
  }
}

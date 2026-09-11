import { applicationConfig } from '../config/application-config';
import {
  clearCoreSessionTokens,
  getCoreAccessToken,
  getCoreCsrfToken,
  setCoreSessionTokens,
} from './core-api-session';

export const CORE_AUTH_LOST_EVENT = 'digvation-core:auth-lost';

interface CoreSessionResponse {
  access_token: string;
  csrf_token: string;
  remember_me: boolean;
}

export class CoreApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'CoreApiError';
  }
}

type CoreApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  retryAuth?: boolean;
};

let refreshPromise: Promise<CoreSessionResponse | null> | null = null;

function endpoint(path: string) {
  const base = applicationConfig.coreApiUrl.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorFromResponse(response: Response, payload: unknown) {
  const body = payload as
    | { message?: string; error?: { code?: string; message?: string } }
    | undefined;
  return new CoreApiError(
    body?.error?.message ??
      body?.message ??
      response.statusText ??
      'Core API request failed',
    response.status,
    body?.error?.code,
  );
}

function notifyAuthLost() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CORE_AUTH_LOST_EVENT));
  }
}

async function requestInternal<T>(
  path: string,
  options: CoreApiOptions,
  mayRefresh: boolean,
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth !== false) {
    const token = getCoreAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint(path), {
    ...options,
    headers,
    credentials: 'include',
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retryAuth !== false &&
    mayRefresh
  ) {
    const refreshed = await refreshCoreApiSession();
    if (refreshed) return requestInternal<T>(path, options, false);
    clearCoreSessionTokens();
    notifyAuthLost();
  }

  const payload = await readPayload(response);
  if (!response.ok) throw errorFromResponse(response, payload);
  return payload as T;
}

export function coreApiRequest<T>(path: string, options: CoreApiOptions = {}) {
  return requestInternal<T>(path, options, true);
}

export async function loginCoreApiSession<T extends CoreSessionResponse>(
  input: unknown,
): Promise<T> {
  const result = await requestInternal<T>(
    '/auth/login',
    { method: 'POST', body: input, auth: false, retryAuth: false },
    false,
  );
  setCoreSessionTokens({
    accessToken: result.access_token,
    csrfToken: result.csrf_token,
    rememberMe: result.remember_me,
  });
  return result;
}

export async function refreshCoreApiSession<
  T extends CoreSessionResponse = CoreSessionResponse,
>(): Promise<T | null> {
  const csrfToken = getCoreCsrfToken();
  if (!csrfToken) return null;
  if (refreshPromise) return refreshPromise as Promise<T | null>;

  refreshPromise = (async () => {
    const response = await fetch(endpoint('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: '{}',
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      clearCoreSessionTokens();
      return null;
    }
    const result = payload as CoreSessionResponse;
    setCoreSessionTokens({
      accessToken: result.access_token,
      csrfToken: result.csrf_token,
      rememberMe: result.remember_me,
    });
    return result;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise as Promise<T | null>;
}

export async function logoutCoreApiSession() {
  const csrfToken = getCoreCsrfToken();
  try {
    if (csrfToken) {
      await fetch(endpoint('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: '{}',
      });
    }
  } finally {
    clearCoreSessionTokens();
  }
}

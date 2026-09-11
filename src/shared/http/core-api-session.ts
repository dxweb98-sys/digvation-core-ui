const SESSION_CSRF_KEY = 'digvation-core.csrf.session';
const PERSISTENT_CSRF_KEY = 'digvation-core.csrf.remembered';

let accessToken: string | null = null;

function safeRead(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(
  storage: Storage | undefined,
  key: string,
  value: string | null,
) {
  if (!storage) return;
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Browser storage can be unavailable in hardened/private contexts.
  }
}

function browserStorage(kind: 'session' | 'local'): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return kind === 'session' ? window.sessionStorage : window.localStorage;
}

export function getCoreAccessToken() {
  return accessToken;
}

export function getCoreCsrfToken() {
  return (
    safeRead(browserStorage('session'), SESSION_CSRF_KEY) ??
    safeRead(browserStorage('local'), PERSISTENT_CSRF_KEY)
  );
}

export function setCoreSessionTokens(input: {
  accessToken: string;
  csrfToken: string;
  rememberMe: boolean;
}) {
  accessToken = input.accessToken;
  safeWrite(browserStorage('session'), SESSION_CSRF_KEY, null);
  safeWrite(browserStorage('local'), PERSISTENT_CSRF_KEY, null);
  if (input.rememberMe) {
    safeWrite(browserStorage('local'), PERSISTENT_CSRF_KEY, input.csrfToken);
  } else {
    safeWrite(browserStorage('session'), SESSION_CSRF_KEY, input.csrfToken);
  }
}

export function clearCoreSessionTokens() {
  accessToken = null;
  safeWrite(browserStorage('session'), SESSION_CSRF_KEY, null);
  safeWrite(browserStorage('local'), PERSISTENT_CSRF_KEY, null);
}

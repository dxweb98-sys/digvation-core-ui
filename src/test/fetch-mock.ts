import { vi } from 'vitest';

export interface RecordedCall {
  method: string;
  url: string;
  headers: Headers;
  body: unknown;
}

type Responder = (call: RecordedCall) => Response | Promise<Response>;

export function envelope(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data, request_id: 'req-1', timestamp: '2026-11-14T00:00:00Z' }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

export function failure(status: number, code: string, details?: unknown[]) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message: `${code} message`, ...(details ? { details } : {}) },
      request_id: 'req-err',
      timestamp: '2026-11-14T00:00:00Z',
      path: '/x',
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Replaces global fetch for one test. Test-only: the application never mocks CORE. */
export function mockFetch(responder: Responder) {
  const calls: RecordedCall[] = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = init?.body;
    let body: unknown = raw;
    if (typeof raw === 'string') {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    const call: RecordedCall = {
      method: init?.method ?? 'GET',
      url: String(input),
      headers: new Headers(init?.headers),
      body,
    };
    calls.push(call);
    return responder(call);
  });
  vi.stubGlobal('fetch', spy);
  return { calls, spy };
}

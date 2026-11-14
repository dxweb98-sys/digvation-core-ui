import type { ErrorCode } from './types';

export interface ApiErrorDetail {
  field?: string;
  reason: string;
  message: string;
}

/** A refused CORE request: `{ success: false, error: { code, message, details? }, request_id }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR' | undefined,
    public readonly details: readonly ApiErrorDetail[] = [],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export function isForbiddenError(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

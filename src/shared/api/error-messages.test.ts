import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { errorReference, fieldErrors, friendlyErrorMessage } from './error-messages';

describe('friendly error messages', () => {
  it('maps a stable code to its Indonesian message, never CORE’s English text', () => {
    const error = new ApiError('Client has open services', 409, 'CLIENT_HAS_OPEN_SERVICES');
    expect(friendlyErrorMessage(error)).toMatch(/Klien belum bisa diarsipkan/);
    expect(friendlyErrorMessage(error)).not.toContain('open services');
  });

  it('falls back to the HTTP status for an unlisted code', () => {
    expect(friendlyErrorMessage(new ApiError('x', 403, 'HOST_IN_USE'))).toBe(
      'Anda tidak punya izin untuk tindakan ini.',
    );
    expect(friendlyErrorMessage(new ApiError('x', 503, undefined))).toMatch(/tidak tersedia/);
    expect(friendlyErrorMessage(new ApiError('x', 500, undefined))).toMatch(/Terjadi kesalahan di server/);
  });

  it('explains a network failure', () => {
    expect(friendlyErrorMessage(new ApiError('x', 0, 'NETWORK_ERROR'))).toMatch(/Tidak bisa terhubung/);
  });

  it('gives a generic message for anything that is not a CORE error', () => {
    expect(friendlyErrorMessage(new Error('boom'))).toBe('Terjadi kesalahan. Coba lagi.');
  });

  it('keys field errors by CORE field name and translates known reasons', () => {
    const error = new ApiError('invalid', 400, 'VALIDATION_ERROR', [
      { field: 'agreed_amount', reason: 'whole_rupiah', message: 'must be whole rupiah' },
      { field: 'code', reason: 'other', message: 'code is too long' },
      { reason: 'other', message: 'no field' },
    ]);
    expect(fieldErrors(error)).toEqual({
      agreed_amount: 'Nominal rupiah harus bilangan bulat.',
      code: 'code is too long',
    });
    expect(fieldErrors(new Error('x'))).toEqual({});
  });

  it('exposes the request id as a support reference', () => {
    expect(errorReference(new ApiError('x', 500, undefined, [], 'req-9'))).toBe('Ref: req-9');
    expect(errorReference(new Error('x'))).toBeUndefined();
  });
});

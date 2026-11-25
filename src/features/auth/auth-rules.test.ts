import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/api-error';
import { USERNAME_RULE } from '../access/password-rules';
import { invitationToken } from './invitation-token';
import { authAlertKey } from './sign-in-copy';

describe('auth form rules', () => {
  it('accepts usernames CORE accepts after lowercasing', () => {
    expect(USERNAME_RULE('Jane.Doe')).toBeUndefined();
    expect(USERNAME_RULE('ab')).toBeDefined();
    expect(USERNAME_RULE('has space')).toBeDefined();
  });

  it('reads the invitation token from the fragment, falling back to the query', () => {
    expect(invitationToken('#token=abc', '')).toBe('abc');
    expect(invitationToken('', '?token=xyz')).toBe('xyz');
    expect(invitationToken('', '')).toBeNull();
  });

  it('maps refused auth requests to the design alerts', () => {
    const login = { 401: 'invalidLogin', 429: 'tooMany' } as const;
    expect(authAlertKey(new ApiError('Invalid credentials', 401, 'UNAUTHORIZED'), login)).toBe('invalidLogin');
    expect(authAlertKey(new ApiError('slow down', 429, 'RATE_LIMITED'), login)).toBe('tooMany');
    expect(authAlertKey(new ApiError('Network request failed', 0, 'NETWORK_ERROR'), login)).toBe('unreachable');
    expect(authAlertKey(new ApiError('boom', 500, undefined), login)).toBe('unreachable');
    expect(authAlertKey(new TypeError('fetch failed'), login)).toBe('unreachable');
    expect(authAlertKey(new ApiError('mail down', 503, undefined), { 503: 'sendFailed' })).toBe('sendFailed');
    expect(authAlertKey(new ApiError('bad code', 400, undefined), { 400: 'codeInvalid' })).toBe('codeInvalid');
  });
});

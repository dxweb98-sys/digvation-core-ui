import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/api-error';
import { USERNAME_RULE } from '../access/password-rules';
import { invitationToken } from './invitation-token';
import { loginErrorMessage } from './login-error';
import { passwordProblems } from './password-problems';

describe('auth form rules', () => {
  it('needs 12 to 128 characters and a matching confirmation', () => {
    expect(passwordProblems('short', 'short')).toEqual({ password: 'Minimal 12 karakter.' });
    expect(passwordProblems('long enough pw', 'other')).toEqual({ confirm: 'Kata sandi tidak cocok.' });
    expect(passwordProblems('long enough pw', 'long enough pw')).toEqual({});
  });

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

  it('never says which sign-in value was wrong', () => {
    expect(loginErrorMessage(new ApiError('Invalid credentials', 401, 'UNAUTHORIZED'))).toBe(
      'Email/username atau password salah.',
    );
    expect(loginErrorMessage(new ApiError('slow down', 429, 'RATE_LIMITED'))).toMatch(/Terlalu banyak/);
  });
});

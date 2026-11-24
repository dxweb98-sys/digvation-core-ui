import { publicAuthApi } from '../access/access-api';
import type { AlertKey } from './sign-in-copy';

/**
 * The active password-reset challenge, held in memory only: a reload forgets it,
 * so the code step sends the operator back to the email step.
 */
export interface ResetChallenge {
  challengeId: string;
  email: string;
  /** Epoch milliseconds when the code stops working. */
  expiresAt: number;
}

let current: ResetChallenge | null = null;

export const getResetChallenge = () => current;

export function setResetChallenge(challengeId: string, email: string, expiresInSeconds: number) {
  current = { challengeId, email, expiresAt: Date.now() + expiresInSeconds * 1000 };
  return current;
}

export function clearResetChallenge() {
  current = null;
}

export const RESET_ROUTES = { email: '/password-reset', code: '/password-reset/code' } as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Asks CORE for a reset code. The answer is generic, so it never tells whether the email exists. */
export function requestResetCode(email: string) {
  return publicAuthApi
    .forgotPassword({ email: email.trim().toLowerCase() })
    .then((challenge) => setResetChallenge(challenge.challenge_id, email.trim(), challenge.expires_in));
}

export const FORGOT_ERRORS = { 429: 'tooMany', 503: 'sendFailed' } as const satisfies Record<number, AlertKey>;

export function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

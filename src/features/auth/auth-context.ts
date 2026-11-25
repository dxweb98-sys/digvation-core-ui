import { createContext } from 'react';
import type { Dto } from '../../shared/api/types';

export type AuthUser = Dto<'PublicUserDto'>;
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
  /** Replaces the cached profile after the operator edits it. */
  setUser(user: AuthUser): void;
  /**
   * Ends the session in this browser only, without POST /auth/logout: used when
   * CORE has already revoked every session (a password change). The notice is
   * handed to the sign-in page.
   */
  endSession(notice?: SignedOutNotice): void;
  /** Why the operator was signed out, for the sign-in page; cleared on sign-in. */
  signedOutNotice: SignedOutNotice | null;
}

export interface SignedOutNotice {
  /** The identifier to prefill; the sign-in page shows "Kata sandi diperbarui". */
  passwordUpdatedFor: string;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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
}

export const AuthContext = createContext<AuthContextValue | null>(null);

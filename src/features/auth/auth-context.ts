import { createContext } from 'react';
import type { AuthStatus, AuthUser, LoginInput } from './types/auth';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

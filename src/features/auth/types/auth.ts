export interface AuthUser {
  id: string;
  fullname: string;
  phoneNumber: string | null;
  email: string;
  username: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

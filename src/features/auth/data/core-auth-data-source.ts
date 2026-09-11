import {
  coreApiRequest,
  loginCoreApiSession,
  logoutCoreApiSession,
  refreshCoreApiSession,
} from '../../../shared/http/core-api-client';
import type { AuthUser, LoginInput } from '../types/auth';

interface CorePublicUser {
  id: string;
  fullname: string;
  phone_number: string | null;
  email: string;
  username: string;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthenticationResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  csrf_token: string;
  remember_me: boolean;
  user: CorePublicUser;
}

function mapUser(user: CorePublicUser): AuthUser {
  return {
    id: user.id,
    fullname: user.fullname,
    phoneNumber: user.phone_number,
    email: user.email,
    username: user.username,
    isActive: user.is_active,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function getCurrentUser() {
  return mapUser(await coreApiRequest<CorePublicUser>('/users/me'));
}

export const coreAuthDataSource = {
  async login(input: LoginInput) {
    await loginCoreApiSession<AuthenticationResponse>({
      identifier: input.identifier,
      password: input.password,
      remember_me: input.rememberMe,
    });
    return getCurrentUser();
  },

  async restore() {
    const refreshed = await refreshCoreApiSession<AuthenticationResponse>();
    if (!refreshed) return null;
    return getCurrentUser();
  },

  async logout() {
    await logoutCoreApiSession();
  },
};

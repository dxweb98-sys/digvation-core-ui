import { isApiError } from '../../shared/api/api-error';
import { friendlyErrorMessage } from '../../shared/api/error-messages';

/** A refused sign-in never says which of the two values was wrong. */
export function loginErrorMessage(error: unknown) {
  if (isApiError(error) && error.status === 401) return 'Email/username atau password salah.';
  return friendlyErrorMessage(error);
}

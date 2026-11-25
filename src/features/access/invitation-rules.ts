import { formatInstant } from '../../shared/format/date';
import type { Invitation } from './access-api';
import type { InvitationsCopy } from './invitations-copy';

const HOUR = 3_600_000;

/** "{n} jam lagi" / "Kurang dari 1 jam lagi": whole hours from the device clock to CORE's expiry. */
export function timeLeft(expiresAt: string, copy: Pick<InvitationsCopy, 'hoursLeft' | 'underAnHour'>, now = Date.now()) {
  const hours = Math.floor((new Date(expiresAt).getTime() - now) / HOUR);
  return hours >= 1 ? copy.hoursLeft(hours) : copy.underAnHour;
}

/** MASA BERLAKU (section A): CORE's own instants, never a computed expiry. */
export function validityText(invitation: Invitation, copy: InvitationsCopy, now = Date.now()): [string, string?] {
  switch (invitation.status) {
    case 'accepted':
      return [copy.acceptedAt(formatInstant(invitation.accepted_at))];
    case 'revoked':
      return [copy.revokedAt(formatInstant(invitation.revoked_at))];
    case 'expired':
      return [copy.expiredAt(formatInstant(invitation.expires_at))];
    case 'pending':
      return [formatInstant(invitation.expires_at), timeLeft(invitation.expires_at, copy, now)];
  }
}


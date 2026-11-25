import { useDisplayLocale } from '../../shared/format/locale';

/** Shell copy of docs/design/02-users.html (section A and the EN table). */
const id = {
  product: 'Digvation',
  productContext: 'Control Center',
  /** Menu labels by group and by path; anything missing shows its English source label. */
  groups: { Overview: 'Ringkasan', Access: 'Akses' } as Partial<Record<string, string>>,
  items: {
    '/': 'Beranda',
    '/users': 'Pengguna',
    '/invitations': 'Undangan',
    '/roles': 'Role',
    '/audit': 'Audit akses',
    '/profile': 'Profil saya',
  } as Partial<Record<string, string>>,
  primaryNavigation: 'Navigasi utama',
  openMenu: 'Buka menu',
  closeMenu: 'Tutup menu',
  accountMenu: 'Menu akun',
  myProfile: 'Profil saya',
  language: 'Bahasa',
  languages: { 'id-ID': 'Bahasa Indonesia', 'en-US': 'English' },
  appearance: 'Tampilan',
  logout: 'Keluar',
};

export type ShellCopy = typeof id;

const en: ShellCopy = {
  product: 'Digvation',
  productContext: 'Control Center',
  groups: { Overview: 'Overview', Access: 'Access' },
  items: {
    '/': 'Home',
    '/users': 'Users',
    '/invitations': 'Invitations',
    '/roles': 'Roles',
    '/audit': 'Access audit',
    '/profile': 'My profile',
  },
  primaryNavigation: 'Primary navigation',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  accountMenu: 'Account menu',
  myProfile: 'My profile',
  language: 'Language',
  languages: { 'id-ID': 'Bahasa Indonesia', 'en-US': 'English' },
  appearance: 'Appearance',
  logout: 'Log out',
};

export function useShellCopy(): ShellCopy {
  return useDisplayLocale() === 'en-US' ? en : id;
}

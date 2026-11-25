import { useDisplayLocale } from '../../shared/format/locale';

/** Copy of docs/design/06-profile.html (sections A–D, EN board F15). */
const id = {
  title: 'Profil saya',
  roles: 'Role',
  noRole: 'Belum punya role',
  tabs: { profile: 'Profil', password: 'Kata sandi' },
  cancel: 'Batal',
  tooMany: ['Terlalu banyak percobaan', 'Tunggu beberapa menit, lalu coba lagi.'] as [string, string],

  fullname: 'Nama lengkap',
  username: 'Username',
  usernameHint: 'Dipakai untuk masuk, bersama email. 3–50 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
  phone: 'Nomor telepon (opsional)',
  phoneHint: 'Maksimal 30 karakter. Kosongkan untuk menghapus.',
  save: 'Simpan profil',
  saving: 'Menyimpan…',
  saved: 'Profil disimpan.',
  fullnameEmpty: 'Isi nama lengkap.',
  fullnameLong: 'Nama lengkap maksimal 150 karakter.',
  usernameInvalid: 'Username hanya boleh huruf kecil, angka, titik, garis bawah, atau tanda hubung (3–50 karakter).',
  usernameTaken: 'Username ini sudah dipakai. Coba yang lain.',
  phoneLong: 'Nomor telepon maksimal 30 karakter.',

  signOutWarning: ['Anda akan keluar dari semua perangkat', 'Termasuk perangkat ini. Setelah itu, masuk lagi dengan kata sandi baru.'] as [string, string],
  currentPassword: 'Kata sandi saat ini',
  newPassword: 'Kata sandi baru',
  newPasswordHint: 'Minimal 12 karakter. Jangan memuat nama email atau username Anda.',
  confirmPassword: 'Ulangi kata sandi baru',
  change: 'Ganti kata sandi',
  changing: 'Mengganti…',
  currentEmpty: 'Isi kata sandi saat ini.',
  currentWrong: 'Kata sandi saat ini salah.',
  newShort: 'Kata sandi minimal 12 karakter.',
  newLong: 'Kata sandi maksimal 128 karakter.',
  newSame: 'Kata sandi baru harus berbeda dari yang sekarang.',
  mismatch: 'Kata sandi belum sama.',
};

export type ProfileCopy = typeof id;

const en: ProfileCopy = {
  title: 'My profile',
  roles: 'Roles',
  noRole: 'No role yet',
  tabs: { profile: 'Profile', password: 'Password' },
  cancel: 'Cancel',
  tooMany: ['Too many attempts', 'Wait a few minutes, then try again.'],

  fullname: 'Full name',
  username: 'Username',
  usernameHint: 'Used to sign in, along with your email. 3–50 characters: lowercase letters, digits, dot, underscore, or hyphen.',
  phone: 'Phone number (optional)',
  phoneHint: 'Up to 30 characters. Leave empty to remove it.',
  save: 'Save profile',
  saving: 'Saving…',
  saved: 'Profile saved.',
  fullnameEmpty: 'Enter your full name.',
  fullnameLong: 'Full name can have at most 150 characters.',
  usernameInvalid: 'A username uses only lowercase letters, digits, dot, underscore, or hyphen (3–50 characters).',
  usernameTaken: 'This username is taken. Try another one.',
  phoneLong: 'Phone number can have at most 30 characters.',

  signOutWarning: ['You will be signed out on every device', 'This one included. Then sign in again with your new password.'],
  currentPassword: 'Current password',
  newPassword: 'New password',
  newPasswordHint: 'At least 12 characters. Do not include your email name or username.',
  confirmPassword: 'Repeat new password',
  change: 'Change password',
  changing: 'Changing…',
  currentEmpty: 'Enter your current password.',
  currentWrong: 'The current password is wrong.',
  newShort: 'The password needs at least 12 characters.',
  newLong: 'A password can have at most 128 characters.',
  newSame: 'The new password must differ from the current one.',
  mismatch: 'The passwords don’t match.',
};

export function useProfileCopy(): ProfileCopy {
  return useDisplayLocale() === 'en-US' ? en : id;
}

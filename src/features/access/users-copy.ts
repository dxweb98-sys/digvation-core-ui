import { useDisplayLocale } from '../../shared/format/locale';

/** Users list and status dialog copy of docs/design/02-users.html (sections B and C, EN table). */
const id = {
  title: 'Pengguna',
  description: 'Akun operator Control Center dan role yang menentukan aksesnya.',
  invite: 'Undang pengguna',
  search: 'Cari nama, email, atau username',
  total: (n: number) => `${n} pengguna`,
  pending: (n: number) => `${n} undangan tertunda`,
  clearSearch: 'Hapus pencarian',
  columns: { user: 'Pengguna', username: 'Username', roles: 'Role', status: 'Status', created: 'Dibuat' },
  you: 'Anda',
  noRole: 'Tanpa role',
  active: 'Aktif',
  inactive: 'Nonaktif',
  emailUnverified: 'Email belum diverifikasi',
  actionsFor: (name: string) => `Aksi untuk ${name}`,
  changeRoles: 'Ubah role',
  deactivate: 'Nonaktifkan',
  reactivate: 'Aktifkan kembali',
  notForSelf: 'Tidak bisa untuk akun sendiri',
  superAdminOnly: 'Hanya Super Admin yang bisa menonaktifkan Super Admin',
  showing: (n: number, total: number) => `Menampilkan ${n} dari ${total} pengguna`,
  noMatch: ['Tidak ada pengguna yang cocok', 'Coba kata kunci lain, atau undang pengguna baru.'],
  loadFailed: ['Daftar pengguna belum bisa dimuat', 'Periksa koneksi ke CORE, lalu coba lagi.'],
  retry: 'Coba lagi',

  deactivateTitle: (name: string) => `Nonaktifkan ${name}?`,
  reactivateTitle: (name: string) => `Aktifkan kembali ${name}?`,
  deactivateBody: (first: string) =>
    `Semua sesi ${first} langsung berakhir, dan ${first} tidak bisa masuk sampai diaktifkan kembali. Role-nya tetap tersimpan.`,
  reactivateBody: (first: string) => `${first} bisa masuk lagi dengan role yang sama seperti sebelumnya.`,
  reason: 'Alasan',
  reasonEmpty: 'Isi alasan.',
  reasonHint: 'Alasan dicatat di audit akses.',
  deactivatePlaceholder: 'Contoh: sudah tidak bekerja di Digvation',
  reactivatePlaceholder: 'Contoh: kembali bertugas',
  cancel: 'Batal',
  close: 'Tutup',
  saving: 'Menyimpan…',
  deactivated: (name: string) => `${name} dinonaktifkan.`,
  reactivated: (name: string) => `${name} diaktifkan kembali.`,
  errors: {
    LAST_SUPER_ADMIN: ['Tidak bisa dinonaktifkan', 'Ini Super Admin aktif terakhir. Jadikan pengguna lain Super Admin dulu.'],
    USER_STATUS_FORBIDDEN: ['Tidak bisa dinonaktifkan', 'Hanya Super Admin yang bisa menonaktifkan Super Admin.'],
    USER_INVALID_TRANSITION: ['Status sudah berubah', 'Pengguna ini sudah dalam status tersebut. Muat ulang daftar.'],
  } as Record<string, [string, string]>,
};

export type UsersCopy = typeof id;

const en: UsersCopy = {
  title: 'Users',
  description: 'Control Center operator accounts and the roles that decide their access.',
  invite: 'Invite user',
  search: 'Search name, email, or username',
  total: (n) => `${n} users`,
  pending: (n) => `${n} pending invitations`,
  clearSearch: 'Clear search',
  columns: { user: 'User', username: 'Username', roles: 'Roles', status: 'Status', created: 'Created' },
  you: 'You',
  noRole: 'No role',
  active: 'Active',
  inactive: 'Inactive',
  emailUnverified: 'Email not verified',
  actionsFor: (name) => `Actions for ${name}`,
  changeRoles: 'Change roles',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
  notForSelf: 'Not available for your own account',
  superAdminOnly: 'Only a Super Admin can deactivate a Super Admin',
  showing: (n, total) => `Showing ${n} of ${total} users`,
  noMatch: ['No matching users', 'Try another keyword, or invite a new user.'],
  loadFailed: ['Couldn’t load users', 'Check the connection to CORE, then try again.'],
  retry: 'Try again',

  deactivateTitle: (name) => `Deactivate ${name}?`,
  reactivateTitle: (name) => `Reactivate ${name}?`,
  deactivateBody: (first) =>
    `All of ${first}’s sessions end right away, and ${first} can’t sign in until reactivated. Their roles are kept.`,
  reactivateBody: (first) => `${first} can sign in again with the same roles as before.`,
  reason: 'Reason',
  reasonEmpty: 'Enter a reason.',
  reasonHint: 'The reason is recorded in the access audit.',
  deactivatePlaceholder: 'For example: no longer works at Digvation',
  reactivatePlaceholder: 'For example: back on duty',
  cancel: 'Cancel',
  close: 'Close',
  saving: 'Saving…',
  deactivated: (name) => `${name} deactivated.`,
  reactivated: (name) => `${name} reactivated.`,
  errors: {
    LAST_SUPER_ADMIN: ['Can’t deactivate', 'This is the last active Super Admin. Make another user Super Admin first.'],
    USER_STATUS_FORBIDDEN: ['Can’t deactivate', 'Only a Super Admin can deactivate a Super Admin.'],
    USER_INVALID_TRANSITION: ['Status already changed', 'This user already has that status. Reload the list.'],
  },
};

export function useUsersCopy(): UsersCopy {
  return useDisplayLocale() === 'en-US' ? en : id;
}

import { useDisplayLocale } from '../../shared/format/locale';
import type { PermissionGroupKey } from './role-rules';

/** Roles page copy of docs/design/04-roles.html (sections A–F, permission labels and EN tables). */
const id = {
  title: 'Role',
  description: 'Role adalah kumpulan izin. Pengguna mendapat gabungan izin dari semua role-nya.',
  create: 'Buat role',
  count: (n: number) => `${n} role`,
  statusLabel: 'Status',
  /** A filter option with its count: "Aktif (5)". */
  withCount: (label: string, n: number) => `${label} (${n})`,
  /** Appended to the toolbar count while a filter is on: " · Status: Aktif". */
  activeFilter: (filter: string, value: string) => ` · ${filter}: ${value}`,
  all: 'Semua',
  active: 'Aktif',
  inactive: 'Nonaktif',
  columns: { role: 'Role', slug: 'Slug', type: 'Jenis', users: 'Pengguna', permissions: 'Izin', status: 'Status' },
  system: 'Sistem',
  custom: 'Kustom',
  allPermissions: 'Semua izin',
  ofCatalog: (n: number, m: number) => `${n} dari ${m}`,
  loadFailed: ['Daftar role belum bisa dimuat', 'Periksa koneksi ke CORE, lalu coba lagi.'] as [string, string],
  retry: 'Coba lagi',

  actionsFor: (name: string) => `Aksi untuk role ${name}`,
  setPermissions: 'Atur izin',
  editDetails: 'Ubah nama dan deskripsi',
  deactivate: 'Nonaktifkan role',
  reactivate: 'Aktifkan kembali',
  locks: {
    superAdminAlways: 'Super Admin selalu punya semua izin',
    systemOnlySuperAdmin: 'Hanya Super Admin yang bisa mengubah izin role sistem',
    activateFirst: 'Aktifkan role ini dulu',
    roleBeyond: 'Role ini punya izin yang tidak Anda miliki',
    permissionNotHeld: 'Anda tidak memiliki izin ini',
  },

  groups: {
    users: 'Pengguna',
    roles: 'Role dan izin',
    audit: 'Audit',
    clients: 'Klien',
    other: 'Lainnya',
  } satisfies Record<PermissionGroupKey, string>,
  permissionLabels: {
    'users.read': 'Lihat pengguna',
    'users.invite': 'Undang pengguna',
    'users.roles.manage': 'Ubah role pengguna',
    'users.lifecycle.manage': 'Nonaktifkan dan aktifkan pengguna',
    'roles.read': 'Lihat role',
    'roles.create': 'Buat role',
    'roles.update': 'Ubah nama dan status role',
    'roles.delete': 'Nonaktifkan role',
    'roles.permissions.manage': 'Atur izin role',
    'permissions.read': 'Lihat daftar izin',
    'authorization.audit.read': 'Lihat audit akses',
    'clients.read': 'Lihat klien',
    'clients.manage': 'Kelola klien',
    'clients.lifecycle.manage': 'Kelola siklus klien',
  } as Partial<Record<string, string>>,
  selectAll: 'Pilih semua',
  clear: 'Kosongkan',

  editorTitle: (name: string) => `Izin role ${name}`,
  usedBy: (n: number) => `${n} pengguna`,
  notUsed: 'Belum dipakai pengguna',
  systemNotice: ['Role sistem', 'Perubahan izin berlaku untuk semua pengguna dengan role ini.'] as [string, string],
  chosenCount: (n: number, m: number) => `${n} dari ${m} izin dipilih`,
  appliesNext: (n: number) =>
    n > 0
      ? `Perubahan berlaku pada permintaan berikutnya untuk ${n} pengguna. Mereka tidak perlu masuk ulang.`
      : 'Perubahan berlaku untuk pengguna yang nanti diberi role ini.',
  savePermissions: 'Simpan izin',
  permissionsSaved: (name: string) => `Izin role ${name} diperbarui.`,
  permissionErrors: {
    ROLE_INACTIVE: ['Role tidak aktif', 'Aktifkan role ini dulu sebelum mengubah izinnya.'],
    ROLE_SYSTEM_IMMUTABLE: ['Tidak bisa disimpan', 'Hanya Super Admin yang bisa mengubah izin role sistem.'],
    PERMISSION_NOT_GRANTABLE: ['Tidak bisa disimpan', 'Ada izin yang tidak Anda miliki.'],
  } as Record<string, [string, string]>,

  createTitle: 'Buat role',
  createDescription: 'Role baru selalu berjenis kustom dan langsung aktif.',
  name: 'Nama role',
  namePlaceholder: 'Contoh: Operasional klien',
  slug: 'Slug',
  slugHint: 'Huruf besar dan garis bawah. Tidak bisa diubah setelah role dibuat.',
  descriptionField: 'Deskripsi (opsional)',
  descriptionPlaceholder: 'Untuk apa role ini dipakai',
  initialPermissions: 'Izin awal (opsional)',
  noPermissionManage: [
    'Izin diatur nanti',
    'Anda tidak punya izin untuk mengatur izin role. Role dibuat tanpa izin; pengguna yang berhak bisa mengaturnya nanti.',
  ] as [string, string],
  nameEmpty: 'Isi nama role.',
  slugEmpty: 'Isi slug.',
  slugTaken: 'Slug ini sudah dipakai role lain.',
  created: (name: string) => `Role ${name} dibuat.`,

  editTitle: 'Ubah nama dan deskripsi',
  editDescription: (slug: string) => `${slug} · slug tidak bisa diubah`,
  save: 'Simpan',
  updated: (name: string) => `Role ${name} diperbarui.`,

  deactivateTitle: (name: string) => `Nonaktifkan role ${name}?`,
  deactivateMessage: (n: number) =>
    n > 0
      ? `${n} pengguna memakai role ini. Mereka berhenti mendapat izin dari role ini pada permintaan berikutnya. Role tetap tersimpan untuk riwayat dan bisa diaktifkan kembali.`
      : 'Belum ada pengguna yang memakai role ini. Role tetap tersimpan untuk riwayat dan bisa diaktifkan kembali.',
  reactivateTitle: (name: string) => `Aktifkan kembali role ${name}?`,
  reactivateMessage: 'Pengguna yang memakai role ini kembali mendapat izinnya pada permintaan berikutnya.',
  deactivated: (name: string) => `Role ${name} dinonaktifkan.`,
  reactivated: (name: string) => `Role ${name} diaktifkan kembali.`,
  cancel: 'Batal',
  saving: 'Menyimpan…',
};

export type RolesCopy = typeof id;

const en: RolesCopy = {
  title: 'Roles',
  description: 'A role is a set of permissions. Users get the combined permissions of all their roles.',
  create: 'Create role',
  count: (n) => `${n} roles`,
  statusLabel: 'Status',
  withCount: (label, n) => `${label} (${n})`,
  activeFilter: (filter, value) => ` · ${filter}: ${value}`,
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
  columns: { role: 'Role', slug: 'Slug', type: 'Type', users: 'Users', permissions: 'Permissions', status: 'Status' },
  system: 'System',
  custom: 'Custom',
  allPermissions: 'All permissions',
  ofCatalog: (n, m) => `${n} of ${m}`,
  loadFailed: ['Couldn’t load roles', 'Check the connection to CORE, then try again.'],
  retry: 'Try again',

  actionsFor: (name) => `Actions for role ${name}`,
  setPermissions: 'Set permissions',
  editDetails: 'Edit name and description',
  deactivate: 'Deactivate role',
  reactivate: 'Reactivate',
  locks: {
    superAdminAlways: 'Super Admin always has every permission',
    systemOnlySuperAdmin: 'Only a Super Admin can change a system role’s permissions',
    activateFirst: 'Reactivate this role first',
    roleBeyond: 'This role has permissions you don’t have',
    permissionNotHeld: 'You don’t have this permission',
  },

  groups: { users: 'Users', roles: 'Roles and permissions', audit: 'Audit', clients: 'Clients', other: 'Other' },
  permissionLabels: {
    'users.read': 'Read users',
    'users.invite': 'Invite users',
    'users.roles.manage': 'Manage user roles',
    'users.lifecycle.manage': 'Deactivate and reactivate users',
    'roles.read': 'Read roles',
    'roles.create': 'Create roles',
    'roles.update': 'Update roles',
    'roles.delete': 'Deactivate roles',
    'roles.permissions.manage': 'Manage role permissions',
    'permissions.read': 'Read permissions',
    'authorization.audit.read': 'Read authorization audit logs',
    'clients.read': 'Read clients',
    'clients.manage': 'Manage clients',
    'clients.lifecycle.manage': 'Manage client lifecycle',
  },
  selectAll: 'Select all',
  clear: 'Clear',

  editorTitle: (name) => `Permissions of ${name}`,
  usedBy: (n) => `${n} users`,
  notUsed: 'Not used yet',
  systemNotice: ['System role', 'Permission changes apply to every user with this role.'],
  chosenCount: (n, m) => `${n} of ${m} permissions chosen`,
  appliesNext: (n) =>
    n > 0
      ? `Changes apply on the next request for ${n} users. They don’t need to sign in again.`
      : 'Changes apply to users who get this role later.',
  savePermissions: 'Save permissions',
  permissionsSaved: (name) => `Permissions of ${name} updated.`,
  permissionErrors: {
    ROLE_INACTIVE: ['Role inactive', 'Reactivate this role before changing its permissions.'],
    ROLE_SYSTEM_IMMUTABLE: ['Couldn’t save', 'Only a Super Admin can change a system role’s permissions.'],
    PERMISSION_NOT_GRANTABLE: ['Couldn’t save', 'Some permissions are ones you don’t have.'],
  },

  createTitle: 'Create role',
  createDescription: 'New roles are always custom and active right away.',
  name: 'Role name',
  namePlaceholder: 'For example: Client operations',
  slug: 'Slug',
  slugHint: 'Capital letters and underscores. Can’t be changed after the role is created.',
  descriptionField: 'Description (optional)',
  descriptionPlaceholder: 'What this role is for',
  initialPermissions: 'Initial permissions (optional)',
  noPermissionManage: [
    'Permissions come later',
    'You can’t set role permissions. The role is created without permissions; someone with the right can set them later.',
  ],
  nameEmpty: 'Enter a role name.',
  slugEmpty: 'Enter a slug.',
  slugTaken: 'Another role already uses this slug.',
  created: (name) => `Role ${name} created.`,

  editTitle: 'Edit name and description',
  editDescription: (slug) => `${slug} · slug can’t be changed`,
  save: 'Save',
  updated: (name) => `Role ${name} updated.`,

  deactivateTitle: (name) => `Deactivate role ${name}?`,
  deactivateMessage: (n) =>
    n > 0
      ? `${n} users have this role. They stop receiving its permissions on the next request. The role is kept for history and can be reactivated.`
      : 'No user has this role yet. The role is kept for history and can be reactivated.',
  reactivateTitle: (name) => `Reactivate role ${name}?`,
  reactivateMessage: 'Users with this role get its permissions back on the next request.',
  deactivated: (name) => `Role ${name} deactivated.`,
  reactivated: (name) => `Role ${name} reactivated.`,
  cancel: 'Cancel',
  saving: 'Saving…',
};

export function useRolesCopy(): RolesCopy {
  return useDisplayLocale() === 'en-US' ? en : id;
}

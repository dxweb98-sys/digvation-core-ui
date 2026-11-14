import { ApiError, type ApiErrorDetail } from './api-error';
import type { ErrorCode } from './types';

/**
 * Operator-facing Indonesian messages per stable CORE error code. CORE's own
 * `message` is English and meant for developers; it is never shown as is.
 * Codes not listed fall back to a message for their HTTP status.
 */
const MESSAGES: Partial<Record<ErrorCode | 'NETWORK_ERROR', string>> = {
  NETWORK_ERROR: 'Tidak bisa terhubung ke server CORE. Periksa koneksi lalu coba lagi.',
  BAD_REQUEST: 'Permintaan tidak valid. Periksa kembali isian Anda.',
  VALIDATION_ERROR: 'Ada isian yang belum benar. Periksa kolom yang ditandai.',
  UNAUTHORIZED: 'Sesi Anda sudah berakhir. Silakan masuk lagi.',
  FORBIDDEN: 'Anda tidak punya izin untuk tindakan ini.',
  NOT_FOUND: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  RESOURCE_NOT_FOUND: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  CONFLICT: 'Data sudah berubah atau bentrok dengan data lain. Muat ulang lalu coba lagi.',
  RESOURCE_CONFLICT: 'Data sudah berubah atau bentrok dengan data lain. Muat ulang lalu coba lagi.',
  RELATION_CONFLICT: 'Data ini masih dipakai data lain sehingga tidak bisa diubah.',
  RELATION_CONSTRAINT_VIOLATION: 'Data ini masih dipakai data lain sehingga tidak bisa diubah.',
  BUSINESS_RULE_VIOLATION: 'Tindakan ini tidak diizinkan oleh aturan bisnis.',
  RATE_LIMITED: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  TRANSACTION_RETRY_EXHAUSTED: 'Server sedang sibuk. Coba lagi sebentar lagi.',
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan di server. Coba lagi, atau hubungi tim teknis.',
  BAD_GATEWAY: 'Server CORE sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
  SERVICE_UNAVAILABLE: 'Server CORE sedang tidak tersedia. Coba lagi sebentar lagi.',
  GATEWAY_TIMEOUT: 'Server CORE terlalu lama merespons. Coba lagi.',
  DATABASE_VALUE_TOO_LONG: 'Ada isian yang terlalu panjang.',
  DATABASE_CONNECTION_TIMEOUT: 'Server sedang sibuk. Coba lagi sebentar lagi.',
  AUTH_CSRF_INVALID: 'Sesi keamanan tidak cocok. Muat ulang halaman lalu coba lagi.',

  USER_NOT_FOUND: 'Pengguna tidak ditemukan.',
  USER_INVALID_TRANSITION: 'Status pengguna tidak bisa diubah ke status itu.',
  USER_SELF_DEACTIVATION: 'Anda tidak bisa menonaktifkan akun Anda sendiri.',
  USER_STATUS_FORBIDDEN: 'Status pengguna ini tidak boleh Anda ubah.',
  USER_IDENTITY_CONFLICT: 'Email atau username sudah dipakai pengguna lain.',
  ROLE_NOT_FOUND: 'Role tidak ditemukan.',
  ROLE_NOT_ASSIGNABLE: 'Role ini tidak bisa diberikan ke pengguna.',
  ROLE_SLUG_CONFLICT: 'Kode role sudah dipakai. Gunakan kode lain.',
  ROLE_SYSTEM_IMMUTABLE: 'Role sistem tidak bisa diubah atau dihapus.',
  ROLE_INACTIVE: 'Role ini tidak aktif.',
  ROLE_ASSIGNMENT_FORBIDDEN: 'Anda tidak boleh memberikan role ini.',
  LAST_SUPER_ADMIN: 'Harus tetap ada minimal satu Super Admin yang aktif.',
  PERMISSION_NOT_FOUND: 'Izin tidak ditemukan.',
  PERMISSION_NOT_GRANTABLE: 'Izin ini tidak bisa diberikan ke role.',
  INVITATION_NOT_FOUND: 'Undangan tidak ditemukan.',
  INVITATION_ACCESS_FORBIDDEN: 'Anda tidak boleh mengelola undangan ini.',
  INVITATION_INVALID: 'Undangan tidak valid atau sudah kedaluwarsa.',
  INVITATION_ALREADY_ACCEPTED: 'Undangan ini sudah diterima.',
  INVITATION_ALREADY_REVOKED: 'Undangan ini sudah dibatalkan.',
  INVITATION_EMAIL_REGISTERED: 'Email ini sudah terdaftar sebagai pengguna.',
  INVITATION_EMAIL_PENDING: 'Email ini masih punya undangan yang belum diterima.',
  INVITATION_DELIVERY_FAILED: 'Undangan tersimpan, tetapi email gagal dikirim.',

  PRODUCT_NOT_FOUND: 'Produk tidak ditemukan.',
  PRODUCT_CODE_CONFLICT: 'Kode produk sudah dipakai. Gunakan kode lain.',
  PRODUCT_INVALID_TRANSITION: 'Status produk tidak bisa diubah ke status itu.',
  PRODUCT_FEATURES_NOT_RETIRED: 'Pensiunkan semua fitur produk ini terlebih dahulu.',
  PRODUCT_MANIFEST_FORMAT_LOCKED: 'Format manifest produk ini sudah terkunci.',
  PRODUCT_HAS_OPEN_SERVICES: 'Produk ini masih dipakai layanan klien yang belum ditutup.',
  PRODUCT_HOSTED: 'Produk ini masih terpasang di sebuah instalasi.',
  CAPABILITY_NOT_FOUND: 'Capability tidak ditemukan.',
  CAPABILITY_CODE_CONFLICT: 'Kode capability sudah dipakai. Gunakan kode lain.',
  CAPABILITY_INVALID_TRANSITION: 'Status capability tidak bisa diubah ke status itu.',
  CATALOG_ITEM_NOT_ACTIVE: 'Item katalog ini tidak aktif.',
  FEATURE_NOT_FOUND: 'Fitur tidak ditemukan.',
  FEATURE_CODE_CONFLICT: 'Kode fitur sudah dipakai di produk ini.',
  FEATURE_INVALID_TRANSITION: 'Status fitur tidak bisa diubah ke status itu.',
  FEATURE_IN_USE: 'Fitur ini masih dipakai layanan klien.',
  PRODUCT_CAPABILITY_NOT_FOUND: 'Capability ini tidak terhubung ke produk.',
  PRODUCT_CAPABILITY_ALREADY_LINKED: 'Capability ini sudah terhubung ke produk.',
  PRODUCT_CAPABILITY_RETIRED: 'Hubungan capability ini sudah dipensiunkan.',
  ADD_ON_NOT_FOUND: 'Add-on tidak ditemukan.',
  ADD_ON_CODE_CONFLICT: 'Kode add-on sudah dipakai di produk ini.',
  ADD_ON_INVALID_TRANSITION: 'Status add-on tidak bisa diubah ke status itu.',
  ADD_ON_GRANT_INVALID: 'Isi add-on tidak valid untuk produk ini.',
  ADD_ON_GRANT_REQUIRED: 'Add-on harus memberikan minimal satu fitur atau capability.',
  ADD_ON_IN_USE: 'Add-on ini masih dipakai layanan atau kontrak klien.',
  PRICE_NOT_FOUND: 'Harga tidak ditemukan.',
  RELEASE_NOT_FOUND: 'Release tidak ditemukan.',
  RELEASE_VERSION_CONFLICT: 'Versi release ini sudah ada.',
  RELEASE_INVALID_TRANSITION: 'Status release tidak bisa diubah ke status itu.',
  RELEASE_NOT_EDITABLE: 'Release ini sudah tidak bisa diubah.',
  RELEASE_ARTIFACT_REQUIRED: 'Lengkapi artefak release sebelum menerbitkannya.',
  RELEASE_TARGETED: 'Release ini masih menjadi target instalasi.',

  CLIENT_NOT_FOUND: 'Klien tidak ditemukan.',
  CLIENT_ARCHIVED: 'Klien ini sudah diarsipkan sehingga tidak bisa diubah.',
  CLIENT_CODE_CONFLICT: 'Kode klien sudah dipakai. Gunakan kode lain.',
  CLIENT_INVALID_TRANSITION: 'Status klien tidak bisa diubah ke status itu.',
  CLIENT_HAS_OPEN_SERVICES:
    'Klien belum bisa diarsipkan karena masih punya layanan yang belum ditutup. Tutup semua layanannya dulu.',
  CLIENT_HAS_UNSETTLED_INVOICES:
    'Klien belum bisa diarsipkan karena masih ada invoice yang belum lunas.',
  CLIENT_HAS_CREDIT:
    'Klien belum bisa diarsipkan karena masih punya saldo kredit. Alokasikan atau kembalikan kreditnya dulu.',
  BRAND_NOT_FOUND: 'Brand tidak ditemukan.',
  BRAND_CODE_CONFLICT: 'Kode brand sudah dipakai di klien ini.',
  BRAND_INVALID_TRANSITION: 'Status brand tidak bisa diubah ke status itu.',
  BRAND_LAST_ACTIVE: 'Brand ini satu-satunya yang aktif. Klien harus punya minimal satu brand aktif.',
  BRAND_HAS_OPEN_SERVICES:
    'Brand belum bisa diarsipkan karena masih dipakai layanan yang belum ditutup.',
  BRAND_HAS_UNSETTLED_INVOICES:
    'Brand belum bisa diarsipkan karena masih ada invoice yang belum lunas.',
  CLIENT_CONTACT_NOT_FOUND: 'Kontak tidak ditemukan.',
  CLIENT_CONTACT_BRAND_MISMATCH: 'Brand kontak harus milik klien yang sama.',
  CLIENT_CONTACT_EMAIL_REQUIRED: 'Kontak penagihan wajib punya email.',
  CLIENT_PRIMARY_CONTACT_REQUIRED: 'Klien harus punya satu kontak utama.',

  SERVICE_NOT_FOUND: 'Layanan tidak ditemukan.',
  SERVICE_ALREADY_EXISTS: 'Brand ini sudah punya layanan untuk produk tersebut.',
  SERVICE_INVALID_TRANSITION: 'Status layanan tidak bisa diubah ke status itu.',
  SERVICE_CLOSED: 'Layanan ini sudah ditutup.',
  SERVICE_CLIENT_NOT_ACTIVE: 'Klien harus aktif untuk membuat atau mengubah layanan.',
  SERVICE_BRAND_NOT_ACTIVE: 'Brand harus aktif untuk membuat atau mengubah layanan.',
  SERVICE_PRODUCT_NOT_ACTIVE: 'Produk harus aktif untuk dipakai layanan.',
  SERVICE_FEATURE_INVALID: 'Ada fitur yang tidak berlaku untuk produk ini.',
  SERVICE_ADD_ON_INVALID: 'Add-on ini tidak berlaku untuk produk layanan.',
  SERVICE_HOSTED: 'Layanan ini masih terpasang di sebuah instalasi.',
  CLIENT_ADD_ON_NOT_FOUND: 'Add-on layanan tidak ditemukan.',
  CLIENT_ADD_ON_ALREADY_HELD: 'Layanan ini sudah punya add-on tersebut.',
  CLIENT_ADD_ON_INVALID_TRANSITION: 'Status add-on layanan tidak bisa diubah ke status itu.',

  CONTRACT_NOT_FOUND: 'Kontrak tidak ditemukan.',
  CONTRACT_ALREADY_EXISTS: 'Layanan ini sudah punya kontrak.',
  CONTRACT_SERVICE_NOT_OPEN: 'Layanan kontrak harus masih terbuka.',
  CONTRACT_INVALID_TRANSITION: 'Status kontrak tidak bisa diubah ke status itu.',
  CONTRACT_CLOSED: 'Kontrak ini sudah ditutup.',
  CONTRACT_CANCEL_INVALID: 'Kontrak ini tidak bisa dibatalkan pada tanggal tersebut.',
  CONTRACT_TERM_NOT_FOUND: 'Term kontrak tidak ditemukan.',
  CONTRACT_TERM_NOT_EDITABLE: 'Term ini sudah dikonfirmasi sehingga tidak bisa diubah.',
  CONTRACT_TERM_INVALID: 'Isi term kontrak tidak valid.',
  CONTRACT_TERM_OVERLAP: 'Periode term bertumpuk dengan term lain di kontrak ini.',
  CONTRACT_TERM_INVALID_TRANSITION: 'Status term tidak bisa diubah ke status itu.',
  CONTRACT_ADJUSTMENT_REASON_REQUIRED: 'Isi alasan penyesuaian harga.',
  CONTRACT_PRICE_CHANGE_REASON_REQUIRED: 'Isi alasan perubahan harga.',
  CONTRACT_ONE_OFF_CHARGE_NOT_FOUND: 'Biaya sekali bayar tidak ditemukan.',
  CONTRACT_ADD_ON_NOT_FOUND: 'Add-on kontrak tidak ditemukan.',
  CONTRACT_ADD_ON_ALREADY_EXISTS: 'Kontrak ini sudah punya add-on tersebut.',
  CONTRACT_ADD_ON_INVALID: 'Add-on ini tidak bisa ditambahkan ke kontrak.',

  BILLING_SETTINGS_INVALID: 'Pengaturan penagihan tidak valid.',
  BILLING_SETTINGS_REQUIRED: 'Lengkapi pengaturan penagihan terlebih dahulu.',
  INVOICE_NOT_FOUND: 'Invoice tidak ditemukan.',
  INVOICE_NOT_DRAFT: 'Invoice ini sudah diterbitkan sehingga tidak bisa diubah.',
  INVOICE_LINE_NOT_FOUND: 'Baris invoice tidak ditemukan.',
  INVOICE_EMPTY: 'Invoice belum punya baris tagihan.',
  INVOICE_TOTAL_NEGATIVE: 'Total invoice tidak boleh negatif.',
  INVOICE_BILLING_CONTACT_MISSING:
    'Brand atau klien belum punya kontak penagihan dengan email. Tambahkan dulu.',
  INVOICE_NOT_EMPTY: 'Hapus semua baris invoice sebelum menghapus draft.',
  INVOICE_BRAND_INVALID: 'Brand invoice harus milik klien yang sama.',
  INVOICE_NOT_SENDABLE: 'Invoice ini belum bisa dikirim.',
  INVOICE_SEND_FAILED: 'Email invoice gagal dikirim. Coba lagi.',
  INVOICE_SOURCE_EXCLUSION_NOT_FOUND: 'Data pengecualian tagihan tidak ditemukan.',
  INVOICE_NOT_VOIDABLE: 'Invoice ini tidak bisa dibatalkan (void).',
  INVOICE_HAS_ALLOCATIONS: 'Lepas dulu alokasi pembayaran dari invoice ini.',
  INVOICE_HAS_CREDIT_NOTES: 'Invoice ini sudah punya credit note sehingga tidak bisa di-void.',
  PAYMENT_NOT_FOUND: 'Pembayaran tidak ditemukan.',
  PAYMENT_NOT_RECORDED: 'Pembayaran ini sudah dibatalkan.',
  PAYMENT_ALLOCATION_NOT_FOUND: 'Alokasi pembayaran tidak ditemukan.',
  PAYMENT_ALLOCATION_CLIENT_MISMATCH: 'Invoice harus milik klien yang sama dengan pembayaran.',
  PAYMENT_ALLOCATION_CURRENCY_MISMATCH: 'Mata uang invoice berbeda dengan pembayaran.',
  PAYMENT_ALLOCATION_INVOICE_NOT_OPEN: 'Invoice ini tidak sedang menunggu pembayaran.',
  PAYMENT_ALLOCATION_EXCEEDS_BALANCE: 'Nominal alokasi melebihi sisa tagihan invoice.',
  PAYMENT_ALLOCATION_EXCEEDS_UNALLOCATED: 'Nominal alokasi melebihi sisa pembayaran.',
  PAYMENT_PROOF_INVALID: 'Bukti bayar harus PDF, JPG, atau PNG dan maksimal 5 MB.',
  PAYMENT_PROOF_EXISTS: 'Pembayaran ini sudah punya bukti bayar.',
  PAYMENT_PROOF_NOT_FOUND: 'Pembayaran ini belum punya bukti bayar.',
  CREDIT_NOTE_NOT_FOUND: 'Credit note tidak ditemukan.',
  CREDIT_NOTE_INVOICE_NOT_OPEN: 'Credit note hanya bisa dibuat untuk invoice yang belum lunas.',
  CREDIT_NOTE_EXCEEDS_BALANCE: 'Nominal credit note melebihi sisa tagihan invoice.',
  CREDIT_NOTE_SEND_FAILED: 'Email credit note gagal dikirim. Coba lagi.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: MESSAGES.BAD_REQUEST!,
  401: MESSAGES.UNAUTHORIZED!,
  403: MESSAGES.FORBIDDEN!,
  404: MESSAGES.NOT_FOUND!,
  409: MESSAGES.CONFLICT!,
  413: 'File terlalu besar.',
  422: MESSAGES.BUSINESS_RULE_VIOLATION!,
  429: MESSAGES.RATE_LIMITED!,
  502: MESSAGES.BAD_GATEWAY!,
  503: MESSAGES.SERVICE_UNAVAILABLE!,
  504: MESSAGES.GATEWAY_TIMEOUT!,
};

const DEFAULT_MESSAGE = 'Terjadi kesalahan. Coba lagi.';

/** Validation reasons that have a clearer Indonesian wording than CORE's English message. */
const REASON_MESSAGES: Record<string, string> = {
  whole_rupiah: 'Nominal rupiah harus bilangan bulat.',
  DUPLICATE_VALUE: 'Nilai ini sudah dipakai.',
  required: 'Wajib diisi.',
};

export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
    return STATUS_MESSAGES[error.status] ?? (error.status >= 500 ? MESSAGES.INTERNAL_SERVER_ERROR! : DEFAULT_MESSAGE);
  }
  return DEFAULT_MESSAGE;
}

export function friendlyDetailMessage(detail: ApiErrorDetail): string {
  return REASON_MESSAGES[detail.reason] ?? detail.message;
}

/** Field-level messages keyed by CORE's snake_case field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.field && !result[detail.field]) result[detail.field] = friendlyDetailMessage(detail);
  }
  return result;
}

/** Shown under a toast so support can find the request in CORE's logs. */
export function errorReference(error: unknown): string | undefined {
  return error instanceof ApiError && error.requestId ? `Ref: ${error.requestId}` : undefined;
}

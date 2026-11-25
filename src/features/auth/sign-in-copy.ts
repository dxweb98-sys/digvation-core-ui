import { isApiError } from '../../shared/api/api-error';
import { useDisplayLocale } from '../../shared/format/locale';

/** Copy of docs/design/01-login.html ("Teks ID / EN"), word for word. */
const id = {
  languageGroup: 'Bahasa',
  appearanceGroup: 'Tampilan',
  appearanceDark: 'Gelap',
  appearanceLight: 'Terang hangat',
  appearanceSystem: 'Ikuti sistem',
  footerApp: 'Control Center',

  loginTitle: 'Masuk ke Control Center',
  loginLead: 'Gunakan akun operator yang diundang oleh admin.',
  identifier: 'Email atau username',
  identifierPlaceholder: 'nama@digvation.id',
  password: 'Kata sandi',
  passwordPlaceholder: 'Masukkan kata sandi',
  rememberMe: 'Tetap masuk di perangkat ini',
  forgotLink: 'Lupa kata sandi?',
  signIn: 'Masuk',
  signingIn: 'Memeriksa…',
  identifierEmpty: 'Isi email atau username.',
  passwordEmpty: 'Isi kata sandi.',
  loginFoot: 'Akun dibuat lewat undangan. Belum punya akun? Minta admin mengundang Anda.',

  forgotTitle: 'Atur ulang kata sandi',
  forgotLead: 'Masukkan email akun Anda. Kami kirim kode 6 digit untuk membuat kata sandi baru.',
  email: 'Email',
  sendCode: 'Kirim kode',
  sendingCode: 'Mengirim…',
  backToSignIn: 'Kembali ke halaman masuk',
  emailEmpty: 'Isi email.',
  emailInvalid: 'Format email belum benar.',

  resetTitle: 'Buat kata sandi baru',
  resetLead: (email: string) => ['Jika ', email, ' terdaftar, kode 6 digit sudah dikirim ke email tersebut.'],
  code: 'Kode verifikasi',
  codePlaceholder: '6 digit',
  newPasswordPlaceholder: 'Minimal 12 karakter',
  codeValid: (time: string) => `Kode berlaku ${time} lagi.`,
  codeExpired: 'Kode sudah kedaluwarsa.',
  resendCode: 'Kirim ulang kode',
  newPassword: 'Kata sandi baru',
  newPasswordHint: 'Minimal 12 karakter.',
  repeatPassword: 'Ulangi kata sandi baru',
  savePassword: 'Simpan kata sandi baru',
  savingPassword: 'Menyimpan…',
  changeEmail: 'Ganti email',
  codeEmpty: 'Isi 6 digit kode dari email.',
  passwordShort: 'Kata sandi baru minimal 12 karakter.',
  // Not in the design table: the 128 limit of CORE's contract, in the same voice.
  passwordLong: 'Kata sandi baru maksimal 128 karakter.',
  passwordMismatch: 'Kata sandi belum sama.',

  alerts: {
    invalidLogin: ['Tidak bisa masuk', 'Email, username, atau kata sandi tidak cocok. Periksa lagi, lalu coba sekali lagi.'],
    tooMany: ['Terlalu banyak percobaan', 'Tunggu beberapa menit, lalu coba lagi.'],
    sendFailed: ['Kode belum bisa dikirim', 'Layanan email sedang bermasalah. Coba lagi beberapa saat lagi.'],
    codeInvalid: ['Kode tidak bisa dipakai', 'Kode salah atau sudah kedaluwarsa. Periksa lagi, atau minta kode baru.'],
    // Added state, pending product-owner confirmation: network failure or unexpected 5xx.
    unreachable: ['Tidak bisa terhubung ke CORE', 'Periksa koneksi, lalu coba lagi.'],
    codeResent: ['Kode baru dikirim', 'Gunakan kode terbaru; kode sebelumnya tidak berlaku lagi.'],
    passwordUpdated: ['Kata sandi diperbarui', 'Silakan masuk dengan kata sandi baru Anda.'],
  },
};

export type SignInCopy = typeof id;
export type AlertKey = keyof SignInCopy['alerts'];

const en: SignInCopy = {
  languageGroup: 'Language',
  appearanceGroup: 'Appearance',
  appearanceDark: 'Dark',
  appearanceLight: 'Warm light',
  appearanceSystem: 'Match system',
  footerApp: 'Control Center',

  loginTitle: 'Sign in to Control Center',
  loginLead: 'Use the operator account your admin invited.',
  identifier: 'Email or username',
  identifierPlaceholder: 'name@digvation.id',
  password: 'Password',
  passwordPlaceholder: 'Enter your password',
  rememberMe: 'Keep me signed in on this device',
  forgotLink: 'Forgot password?',
  signIn: 'Sign in',
  signingIn: 'Checking…',
  identifierEmpty: 'Enter your email or username.',
  passwordEmpty: 'Enter your password.',
  loginFoot: 'Accounts are created by invitation. No account yet? Ask an admin to invite you.',

  forgotTitle: 'Reset your password',
  forgotLead: 'Enter your account email. We’ll send a 6-digit code so you can set a new password.',
  email: 'Email',
  sendCode: 'Send code',
  sendingCode: 'Sending…',
  backToSignIn: 'Back to sign in',
  emailEmpty: 'Enter your email.',
  emailInvalid: 'That email doesn’t look right.',

  resetTitle: 'Set a new password',
  resetLead: (email: string) => ['If ', email, ' is registered, a 6-digit code has been sent to it.'],
  code: 'Verification code',
  codePlaceholder: '6 digits',
  newPasswordPlaceholder: 'At least 12 characters',
  codeValid: (time: string) => `Code valid for ${time}.`,
  codeExpired: 'This code has expired.',
  resendCode: 'Resend code',
  newPassword: 'New password',
  newPasswordHint: 'At least 12 characters.',
  repeatPassword: 'Repeat new password',
  savePassword: 'Save new password',
  savingPassword: 'Saving…',
  changeEmail: 'Use a different email',
  codeEmpty: 'Enter the 6-digit code from the email.',
  passwordShort: 'The new password needs at least 12 characters.',
  passwordLong: 'The new password can have at most 128 characters.',
  passwordMismatch: 'The passwords don’t match.',

  alerts: {
    invalidLogin: ['Couldn’t sign in', 'The email, username, or password doesn’t match. Check them and try again.'],
    tooMany: ['Too many attempts', 'Wait a few minutes, then try again.'],
    sendFailed: ['Couldn’t send the code', 'The email service is having trouble. Try again in a moment.'],
    codeInvalid: ['Code can’t be used', 'The code is wrong or has expired. Check it, or request a new code.'],
    unreachable: ['Can’t reach CORE', 'Check your connection, then try again.'],
    codeResent: ['New code sent', 'Use the newest code; the previous one no longer works.'],
    passwordUpdated: ['Password updated', 'Sign in with your new password.'],
  },
};

export function useSignInCopy(): SignInCopy {
  return useDisplayLocale() === 'en-US' ? en : id;
}

/**
 * The alert for a refused auth request. `expected` maps the statuses the
 * endpoint documents; anything else (network, 5xx, undocumented) is "unreachable".
 */
export function authAlertKey(error: unknown, expected: Partial<Record<number, AlertKey>>): AlertKey {
  if (!isApiError(error)) return 'unreachable';
  return expected[error.status] ?? 'unreachable';
}

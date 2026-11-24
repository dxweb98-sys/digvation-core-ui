import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import { setDisplayLocale } from '../../../shared/format/locale';
import { clearResetChallenge, setResetChallenge } from '../reset-challenge';
import { LoginPage } from './login-page';
import { PasswordResetCodePage } from './password-reset-code-page';
import { PasswordResetPage } from './password-reset-page';

const login = vi.fn();
const forgotPassword = vi.fn();
const resetPassword = vi.fn();

vi.mock('../use-auth', () => ({ useAuth: () => ({ status: 'anonymous', login }) }));
vi.mock('../../access/access-api', () => ({
  publicAuthApi: {
    forgotPassword: (body: unknown) => forgotPassword(body),
    resetPassword: (body: unknown) => resetPassword(body),
  },
}));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/password-reset/code" element={<PasswordResetCodePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const submit = (id: string) => fireEvent.submit(document.getElementById(id) as HTMLFormElement);
const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: 'input' }), { target: { value } });

beforeEach(() => {
  login.mockReset();
  forgotPassword.mockReset();
  resetPassword.mockReset();
  clearResetChallenge();
  setDisplayLocale('id-ID');
});

afterEach(() => vi.useRealTimers());

describe('sign in', () => {
  it('shows linked errors, focuses the first invalid field, and does not sign in', async () => {
    renderAt('/login');
    const identifier = screen.getByRole('textbox', { name: /email atau username/i });

    submit('login-form');

    await waitFor(() => expect(identifier).toHaveAttribute('aria-invalid', 'true'));
    expect(document.getElementById(identifier.getAttribute('aria-describedby') as string)).toHaveTextContent(
      'Isi email atau username.',
    );
    expect(screen.getByText('Isi kata sandi.')).toBeInTheDocument();
    await waitFor(() => expect(identifier).toHaveFocus());
    expect(login).not.toHaveBeenCalled();
  });

  it('sends remember_me checked by default; a 401 clears the password and focuses it', async () => {
    login.mockRejectedValue(new ApiError('Invalid credentials', 401, 'UNAUTHORIZED'));
    renderAt('/login');
    type(/email atau username/i, 'ops@digvation.id');
    type(/^kata sandi$/i, 'wrong password');

    submit('login-form');

    expect(await screen.findByRole('alert')).toHaveTextContent('Tidak bisa masuk');
    expect(login).toHaveBeenCalledWith({ identifier: 'ops@digvation.id', password: 'wrong password', rememberMe: true });
    const password = screen.getByLabelText(/^kata sandi$/i, { selector: 'input' });
    expect(password).toHaveValue('');
    expect(password).toHaveFocus();
  });

  it.each([
    [new ApiError('slow down', 429, 'RATE_LIMITED'), 'Terlalu banyak percobaan'],
    [new ApiError('Network request failed', 0, 'NETWORK_ERROR'), 'Tidak bisa terhubung ke CORE'],
    [new ApiError('boom', 502, undefined), 'Tidak bisa terhubung ke CORE'],
  ])('maps %s to its alert', async (error, title) => {
    login.mockRejectedValue(error);
    renderAt('/login');
    type(/email atau username/i, 'ops');
    type(/^kata sandi$/i, 'pw');
    submit('login-form');
    expect(await screen.findByRole('alert')).toHaveTextContent(title);
  });

  it('switches the copy to English', () => {
    renderAt('/login');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { name: 'Sign in to Control Center' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Keep me signed in on this device')).toBeInTheDocument();
  });
});

describe('forgot password', () => {
  it('validates an empty and a malformed email without calling CORE', async () => {
    renderAt('/password-reset');
    submit('forgot-form');
    expect(await screen.findByText('Isi email.')).toBeInTheDocument();
    type(/^email$/i, 'not-an-email');
    expect(await screen.findByText('Format email belum benar.')).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('maps 503 to the send failure alert', async () => {
    forgotPassword.mockRejectedValue(new ApiError('mail down', 503, undefined));
    renderAt('/password-reset');
    type(/^email$/i, 'ops@digvation.id');
    submit('forgot-form');
    expect(await screen.findByRole('alert')).toHaveTextContent('Kode belum bisa dikirim');
  });

  it('moves to the code step with the challenge in memory', async () => {
    forgotPassword.mockResolvedValue({ challenge_id: 'c1', expires_in: 600 });
    renderAt('/password-reset');
    type(/^email$/i, 'Ops@Digvation.id');
    submit('forgot-form');
    expect(await screen.findByRole('heading', { name: 'Buat kata sandi baru' })).toBeInTheDocument();
    expect(forgotPassword).toHaveBeenCalledWith({ email: 'ops@digvation.id' });
  });
});

describe('new password', () => {
  it('sends the operator to the email step without a challenge (reload)', () => {
    renderAt('/password-reset/code');
    expect(screen.getByRole('heading', { name: 'Atur ulang kata sandi' })).toBeInTheDocument();
  });

  it('counts down, expires, and resends with a new challenge', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setResetChallenge('c1', 'ops@digvation.id', 2);
    forgotPassword.mockResolvedValue({ challenge_id: 'c2', expires_in: 600 });
    renderAt('/password-reset/code');
    expect(screen.getByText('Kode berlaku 00:02 lagi.')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByText('Kode sudah kedaluwarsa.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kirim ulang kode' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Kode baru dikirim');
    expect(screen.getByText('Kode berlaku 10:00 lagi.')).toBeInTheDocument();

    type(/kode verifikasi/i, '12a3456');
    type(/^kata sandi baru$/i, 'a long enough pw');
    type(/ulangi kata sandi baru/i, 'a long enough pw');
    resetPassword.mockResolvedValue({ message: 'ok' });
    submit('reset-form');
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(expect.objectContaining({ challenge_id: 'c2', otp: '123456' })));
    expect(await screen.findByText('Kata sandi diperbarui')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email atau username/i })).toHaveValue('ops@digvation.id');
  });

  it('validates code and passwords in the browser', async () => {
    setResetChallenge('c1', 'ops@digvation.id', 600);
    renderAt('/password-reset/code');
    type(/^kata sandi baru$/i, 'short');
    type(/ulangi kata sandi baru/i, 'other');
    submit('reset-form');
    expect(await screen.findByText('Isi 6 digit kode dari email.')).toBeInTheDocument();
    expect(screen.getByText('Kata sandi baru minimal 12 karakter.')).toBeInTheDocument();
    expect(screen.getByText('Kata sandi belum sama.')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('a 400 clears the code and focuses it', async () => {
    setResetChallenge('c1', 'ops@digvation.id', 600);
    resetPassword.mockRejectedValue(new ApiError('bad code', 400, undefined));
    renderAt('/password-reset/code');
    type(/kode verifikasi/i, '123456');
    type(/^kata sandi baru$/i, 'a long enough pw');
    type(/ulangi kata sandi baru/i, 'a long enough pw');
    submit('reset-form');
    expect(await screen.findByRole('alert')).toHaveTextContent('Kode tidak bisa dipakai');
    const code = screen.getByLabelText(/kode verifikasi/i, { selector: 'input' });
    expect(code).toHaveValue('');
    expect(code).toHaveFocus();
  });
});

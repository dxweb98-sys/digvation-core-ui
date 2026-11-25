import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { AcceptInvitationPage } from './accept-invitation-page';

afterEach(() => vi.unstubAllGlobals());

const verified = () => envelope({ email: 'yoga@digvation.id', expires_at: '2026-11-26T03:10:00Z' });

function serve(accept: (call: RecordedCall) => Response = () => envelope({ message: 'ok', user: {} })) {
  return mockFetch((call) => (call.url.endsWith('/invitations/verify') ? verified() : accept(call)));
}

const start = () => renderApp(<AcceptInvitationPage />, { route: '/#token=tok-1' });

async function fill(values: Partial<Record<string, string>> = {}) {
  await screen.findByText('yoga@digvation.id');
  const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  set('Nama lengkap', values.fullname ?? 'Yoga Pratama');
  set('Username', values.username ?? 'Yoga.P');
  set('Nomor telepon (opsional)', values.phone ?? '');
  set('Kata sandi', values.password ?? 'kuda-terbang-biru');
  set('Ulangi kata sandi', values.confirm ?? values.password ?? 'kuda-terbang-biru');
  fireEvent.click(screen.getByRole('button', { name: 'Buat akun' }));
}

describe('accept invitation', () => {
  it('shows the invitation marker: email, date and hours left', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-25T03:00:00Z') });
    serve();
    start();
    expect(await screen.findByText('yoga@digvation.id')).toBeInTheDocument();
    expect(screen.getByText('Lengkapi data di bawah untuk membuat akun Anda.')).toBeInTheDocument();
    expect(screen.getByText('Undangan untuk')).toBeInTheDocument();
    expect(screen.getByText(/^Berlaku sampai 26 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText('24 jam lagi')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('says less than an hour when under an hour is left', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-26T02:30:00Z') });
    serve();
    start();
    expect(await screen.findByText('Kurang dari 1 jam lagi')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('cannot be used without a token', async () => {
    const { calls } = serve();
    renderApp(<AcceptInvitationPage />);
    expect(await screen.findByText('Undangan tidak bisa dipakai')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('cannot be used when verify fails', async () => {
    mockFetch(() => failure(400, 'INVITATION_INVALID'));
    start();
    expect(await screen.findByText('Undangan tidak bisa dipakai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ke halaman masuk' })).toBeInTheDocument();
  });

  it('validates on the client and focuses the first invalid field', async () => {
    const { calls } = serve();
    start();
    await fill({ fullname: ' ', username: 'ab', password: 'short', confirm: 'other' });
    expect(await screen.findByText('Isi nama lengkap.')).toBeInTheDocument();
    expect(screen.getByText(/Username hanya boleh huruf kecil/)).toBeInTheDocument();
    expect(screen.getByText('Kata sandi minimal 12 karakter.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Nama lengkap')).toHaveFocus());
    expect(calls.filter((call) => call.url.endsWith('/accept'))).toHaveLength(0);
  });

  it('sends the username lowercase and the phone as typed, then shows done', async () => {
    const { calls } = serve();
    start();
    await fill({ phone: '0812 3456' });
    expect(await screen.findByText('Akun Anda sudah dibuat')).toBeInTheDocument();
    expect(screen.getByText('Belum ada role')).toBeInTheDocument();
    const body = calls.find((call) => call.url.endsWith('/invitations/accept'))!.body as Record<string, string>;
    expect(body).toMatchObject({ token: 'tok-1', username: 'yoga.p', phone_number: '0812 3456', fullname: 'Yoga Pratama' });
  });

  it('shows USER_IDENTITY_CONFLICT under Username', async () => {
    serve(() => failure(409, 'USER_IDENTITY_CONFLICT'));
    start();
    await fill();
    expect(await screen.findByText('Username ini sudah dipakai. Coba yang lain.')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a password policy refusal under Kata sandi', async () => {
    serve(() => failure(400, 'VALIDATION_ERROR'));
    start();
    await fill();
    expect(await screen.findByText(/Kata sandi ini tidak bisa dipakai/)).toBeInTheDocument();
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('aria-invalid', 'true');
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { InviteUserDialog } from './invite-user-dialog';

afterEach(() => vi.unstubAllGlobals());

function open(respond: () => Response) {
  const onClose = vi.fn();
  const { calls } = mockFetch(() => respond());
  renderApp(<InviteUserDialog open onClose={onClose} />);
  const dialog = within(screen.getByRole('dialog'));
  const send = (email: string) => {
    fireEvent.change(dialog.getByLabelText('Email'), { target: { value: email } });
    fireEvent.click(dialog.getByRole('button', { name: 'Kirim undangan' }));
  };
  return { dialog, send, calls, onClose };
}

describe('invite dialog', () => {
  it('checks empty and format before calling CORE', async () => {
    const { dialog, send, calls } = open(() => envelope({}));
    send('');
    expect(await dialog.findByText('Isi email.')).toBeInTheDocument();
    send('not-an-email');
    expect(await dialog.findByText('Format email belum benar.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['INVITATION_EMAIL_REGISTERED', 'Email ini sudah terdaftar sebagai pengguna.'],
    ['INVITATION_EMAIL_PENDING', 'Email ini masih punya undangan yang menunggu.'],
  ])('shows %s under the field', async (code, message) => {
    const { dialog, send } = open(() => failure(409, code));
    send('a@digvation.id');
    expect(await dialog.findByText(message)).toBeInTheDocument();
  });

  it('keeps the dialog open with an alert when delivery fails', async () => {
    const { dialog, send, onClose } = open(() => failure(503, 'INVITATION_DELIVERY_FAILED'));
    send('a@digvation.id');
    expect(await dialog.findByText('Undangan tidak terkirim')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes and toasts the expiry from the response', async () => {
    const { send, onClose, calls } = open(() =>
      envelope({ message: 'ok', invitation_id: 'inv-9', expires_at: '2026-11-26T04:00:00Z' }),
    );
    send('Baru@Digvation.id');
    expect(await screen.findByText(/^Undangan dikirim ke baru@digvation\.id\. Berlaku sampai 26 Nov 2026/)).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ email: 'baru@digvation.id' });
  });
});

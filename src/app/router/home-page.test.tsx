import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockFetch } from '../../test/fetch-mock';
import { renderApp } from '../../test/render-app';
import { HomePage } from './home-page';

afterEach(() => vi.unstubAllGlobals());

describe('home', () => {
  it('shows the no-role card and reloads permissions', async () => {
    const { calls } = mockFetch(() => envelope({ roles: [], permissions: [] }));
    renderApp(<HomePage />);
    expect(await screen.findByText('Akun Anda belum punya role')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang' }));
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/authorization/me'))).toHaveLength(2));
  });
});

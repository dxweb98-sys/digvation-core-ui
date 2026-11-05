import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';

const login = vi.fn();

vi.mock('../../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core' },
}));
vi.mock('../use-auth', () => ({
  useAuth: () => ({ status: 'anonymous', login }),
}));

function renderLogin() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
  return {
    identifier: screen.getByRole('textbox', { name: /email or username/i }),
    form: document.getElementById('login-form') as HTMLFormElement,
  };
}

beforeEach(() => login.mockReset());

describe('login form errors', () => {
  it('shows linked errors, focuses the first invalid field, and does not sign in', async () => {
    const { identifier, form } = renderLogin();

    fireEvent.submit(form);

    await waitFor(() => expect(identifier).toHaveAttribute('aria-invalid', 'true'));
    const describedBy = identifier.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toHaveTextContent('Enter your email or username.');
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    await waitFor(() => expect(identifier).toHaveFocus());
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the error on blur', async () => {
    const { identifier } = renderLogin();

    fireEvent.blur(identifier);

    await waitFor(() => expect(identifier).toHaveAttribute('aria-invalid', 'true'));
  });
});

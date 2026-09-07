import { QueryClientProvider } from '@tanstack/react-query';
import { DToastProvider } from '@digvation-labs/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createApplicationQueryClient } from '../providers/query-client';
import { applicationRoutes } from './application-routes';

function renderRoute(path: string) {
  const router = createMemoryRouter(applicationRoutes, {
    initialEntries: [path],
  });

  return render(
    <QueryClientProvider client={createApplicationQueryClient()}>
      <DToastProvider>
        <RouterProvider router={router} />
      </DToastProvider>
    </QueryClientProvider>,
  );
}

describe('application routing foundation', () => {
  it('renders operational dashboard sections through the application shell', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Requires attention' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Client application health' }),
    ).toBeInTheDocument();
    expect(screen.getByText('POS API restart loop')).toBeInTheDocument();
    expect(screen.getByText('stark')).toBeInTheDocument();
  });

  it('keeps grouped navigation functional for reserved routes', async () => {
    renderRoute('/clients');

    expect(
      await screen.findByRole('heading', { name: 'Clients' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Clients' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );

    const menuButton = screen.getByRole('button', { name: 'Menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));
    expect(screen.getByRole('dialog', { name: 'Add client' })).toBeInTheDocument();
    expect(screen.getByLabelText('Client Code *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    const actionMenu = document.querySelector<HTMLElement>('[data-ds-component="data-table"] tbody [data-ds-component="dropdown-trigger"]');
    expect(actionMenu).not.toBeNull();
    fireEvent.click(actionMenu!);
    fireEvent.click(screen.getByRole('button', { name: 'Quick Detail' }));
    expect(await screen.findByRole('dialog', { name: 'Nova Salon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Client' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Products' }));
    expect(await screen.findByText('Assign Product')).toBeInTheDocument();
    expect(screen.getAllByText('Digvation POS').length).toBeGreaterThan(0);

    const productRelationshipTable = screen.getAllByRole('table').at(-1);
    const productRelationshipActionButton = productRelationshipTable?.querySelector<HTMLButtonElement>('tbody button');
    expect(productRelationshipActionButton).not.toBeNull();
    fireEvent.click(productRelationshipActionButton!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create Installation' }));
    const contextualInstallationDialog = await screen.findByRole('dialog', { name: 'Add installation' });
    expect(contextualInstallationDialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Relationship' })).toBeInTheDocument();
    expect(screen.getByText(/is locked for this contextual creation/)).toBeInTheDocument();
    fireEvent.click(within(contextualInstallationDialog).getByRole('button', { name: 'Close dialog' }));

    const actionButtons = screen.getAllByRole('button', { name: 'Actions' });
    fireEvent.click(actionButtons[0]);
    expect(screen.getByRole('menuitem', { name: 'Suspend' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Start Trial' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Installations' }));
    expect((await screen.findAllByText('Nova POS Production')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'More Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Mark Suspended' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mark Archived' })).toBeInTheDocument();
  });

  it('renders installation management through the canonical table and dialog flow', async () => {
    renderRoute('/installations');

    expect(await screen.findByRole('heading', { name: 'Installations' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Installation' }));
    expect(screen.getByRole('dialog', { name: 'Add installation' })).toBeInTheDocument();
    expect(screen.getByText('Client Product *')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    const actionMenu = document.querySelector<HTMLElement>('[data-ds-component="data-table"] tbody [data-ds-component="dropdown-trigger"]');
    expect(actionMenu).not.toBeNull();
    fireEvent.click(actionMenu!);
    expect(screen.getByRole('button', { name: 'Open Installation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Installation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More Actions' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Installation' }));
    expect(await screen.findByRole('dialog', { name: 'Nova POS Production' })).toBeInTheDocument();
    expect(screen.queryByText('Installation not found')).not.toBeInTheDocument();
  });

  it('renders a recoverable not-found state for unknown routes', async () => {
    renderRoute('/unknown-control-center-view');

    expect(
      await screen.findByText('Page not found'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Return to overview' }),
    ).toBeInTheDocument();
  });

  it('renders product management through the canonical table and dialog flow', async () => {
    renderRoute('/products');

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Product' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    expect(screen.getByRole('dialog', { name: 'Add product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product Code *')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Product Code *'), { target: { value: 'ops console' } });
    fireEvent.change(screen.getByLabelText('Product Name *'), { target: { value: 'Operations Console' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(await screen.findByText('Product created')).toBeInTheDocument();

    const actionMenu = document.querySelector<HTMLElement>('[data-ds-component="data-table"] tbody [data-ds-component="dropdown-trigger"]');
    expect(actionMenu).not.toBeNull();
    fireEvent.click(actionMenu!);
    fireEvent.click(screen.getByRole('button', { name: 'Quick Detail' }));

    expect(await screen.findByRole('dialog', { name: 'Operations Console' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clients' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Mark Active' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mark Retired' })).toBeInTheDocument();
  });
});

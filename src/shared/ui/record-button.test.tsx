import { DDataTable, DToastProvider, type TableColumn } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CapabilityListPage } from '../../features/capabilities/pages/capability-list-page';
import { ClientListPage } from '../../features/clients/pages/client-list-page';
import { InstallationListPage } from '../../features/installations/pages/installation-list-page';
import { ProductListPage } from '../../features/products/pages/product-list-page';
import { UsersPage, RolesPage } from '../../features/access/pages/access-pages';
import { IncidentsPage } from '../../features/operations/pages/incidents-page';
import { InfrastructureListPage } from '../../features/infrastructure/pages/infrastructure-list-page';
import { RecordButton } from './record-button';

function wrap(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <DToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </DToastProvider>
    </QueryClientProvider>
  );
}

describe('RecordButton', () => {
  it('is a real button that fires the row click exactly once', () => {
    const onRowClick = vi.fn();
    const columns: TableColumn<{ id: string; name: string }>[] = [
      { key: 'name', label: 'Name', render: (row) => <RecordButton>{row.name}</RecordButton> },
    ];
    render(<DDataTable columns={columns} data={[{ id: '1', name: 'Nova' }]} rowKey="id" onRowClick={onRowClick} />);

    const button = within(screen.getByRole('table')).getByRole('button', { name: 'Nova' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Nova' });
  });
});

describe('every list with a detail opens it from its primary cell', () => {
  it.each([
    ['clients', <ClientListPage />],
    ['products', <ProductListPage />],
    ['capabilities', <CapabilityListPage />],
    ['installations', <InstallationListPage />],
    ['infrastructure', <InfrastructureListPage />],
    ['incidents', <IncidentsPage />],
    ['users', <UsersPage />],
    ['roles', <RolesPage />],
  ] as Array<[string, ReactNode]>)('%s', async (_name, page) => {
    render(wrap(page));

    const button = await waitFor(() => {
      const element = document.querySelector<HTMLButtonElement>('tbody .record-button');
      expect(element).not.toBeNull();
      return element as HTMLButtonElement;
    });
    fireEvent.click(button);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

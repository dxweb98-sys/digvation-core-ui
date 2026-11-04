import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CapabilityDetailDialog } from '../../features/capabilities/components/capability-detail-dialog';
import { CapabilityFormDialog } from '../../features/capabilities/components/capability-form-dialog';
import { ClientDetailDialog } from '../../features/clients/components/client-detail-dialog';
import { ClientFormDialog } from '../../features/clients/components/client-form-dialog';
import { InfrastructureDetailDialog } from '../../features/infrastructure/components/infrastructure-detail-dialog';
import { InfrastructureFormDialog } from '../../features/infrastructure/components/infrastructure-form-dialog';
import { InstallationDetailDialog } from '../../features/installations/components/installation-detail-dialog';
import { InstallationFormDialog } from '../../features/installations/components/installation-form-dialog';
import { ProductDetailDialog } from '../../features/products/components/product-detail-dialog';
import { ProductFormDialog } from '../../features/products/components/product-form-dialog';

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

const onClose = vi.fn();

function buttonOrder(dialog: HTMLElement, names: string[]) {
  const all = within(dialog).getAllByRole('button').map((button) => button.textContent?.trim());
  return names.map((name) => all.indexOf(name));
}

describe('detail dialogs follow the shared pattern', () => {
  it.each([
    {
      name: 'Nova Salon',
      node: <ClientDetailDialog clientId="client-nova" open onClose={onClose} />,
      identifier: 'NOVA',
      sections: ['Identity', 'Contact', 'Organization', 'Record'],
      edit: 'Edit Client',
    },
    {
      name: 'Digvation POS',
      node: <ProductDetailDialog productId="product-pos" open onClose={onClose} />,
      identifier: 'POS',
      sections: ['Product', 'Record'],
      edit: 'Edit Product',
    },
    {
      name: 'Membership',
      node: <CapabilityDetailDialog capabilityId="capability-membership" open onClose={onClose} />,
      identifier: 'MEMBERSHIP',
      sections: ['Capability', 'Record'],
      edit: 'Edit Capability',
    },
    {
      name: 'Nova Production',
      node: <InstallationDetailDialog installationId="installation-nova-production" open onClose={onClose} />,
      identifier: 'NOVA-PROD',
      sections: ['Deployment', 'Record'],
      edit: 'Edit Installation',
    },
  ])('$name', async ({ name, node, identifier, sections, edit }) => {
    render(wrap(node));

    const dialog = await screen.findByRole('dialog', { name });
    const code = within(dialog).getAllByText(identifier).find((element) => element.classList.contains('app-dialog-identifier'));
    expect(code?.tagName).toBe('CODE');
    for (const section of sections) {
      expect(within(dialog).getByRole('heading', { name: section })).toBeInTheDocument();
    }
    const [close, primary] = buttonOrder(dialog, ['Close', edit]);
    expect(close).toBeGreaterThanOrEqual(0);
    expect(primary).toBeGreaterThan(close);
  });

  it('shows the infrastructure pattern', async () => {
    const { resolveInfrastructureDataSource } = await import('../../features/infrastructure/data/resolve-infrastructure-data-source');
    const nodes = await resolveInfrastructureDataSource().getInfrastructureNodes({ search: '', ownership: 'ALL', lifecycleStatus: 'ALL', page: 1, limit: 10 } as never);
    const node = nodes.nodes[0];

    render(wrap(<InfrastructureDetailDialog nodeId={node.id} open onClose={onClose} />));

    const dialog = await screen.findByRole('dialog', { name: node.name });
    for (const section of ['Resource', 'Network', 'Capacity', 'Record']) {
      expect(within(dialog).getByRole('heading', { name: section })).toBeInTheDocument();
    }
  });

  it('uses one empty mark instead of a fallback sentence', async () => {
    render(wrap(<ClientDetailDialog clientId="client-poseidon" open onClose={onClose} />));

    const dialog = await screen.findByRole('dialog', { name: 'Poseidon Filter' });
    expect(within(dialog).queryByText('Not recorded')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Legal Name').nextElementSibling).toHaveTextContent('—');
  });
});

describe('form dialogs keep their fields and actions', () => {
  it('moves the client form actions to the footer and groups edit fields', () => {
    render(wrap(
      <ClientFormDialog
        open
        mode="edit"
        client={{ id: 'c', code: 'NOVA', displayName: 'Nova', status: 'ACTIVE', createdAt: '', updatedAt: '', statusChangedAt: '' } as never}
        onClose={onClose}
      />,
    ));

    const dialog = screen.getByRole('dialog', { name: 'Edit Nova' });
    for (const section of ['Identity', 'Organization']) {
      expect(within(dialog).getByRole('heading', { name: section })).toBeInTheDocument();
    }
    for (const label of ['Client Code *', 'Display Name *', 'Legal Name', 'Organization Email', 'Organization Phone', 'Website', 'Tax Identifier', 'Country', 'Timezone', 'Address', 'Notes']) {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    }
    const save = within(dialog).getByRole('button', { name: 'Save Changes' });
    expect(save).toHaveAttribute('form', 'client-form');
    expect(save.closest('.app-dialog-footer')).not.toBeNull();
    expect(dialog.querySelector('form#client-form')).not.toBeNull();
  });

  it('keeps the create form to its create fields', () => {
    render(wrap(<ClientFormDialog open mode="create" onClose={onClose} />));

    const dialog = screen.getByRole('dialog', { name: 'Add client' });
    expect(within(dialog).queryByLabelText('Website')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create Client' })).toBeInTheDocument();
  });

  it.each([
    ['Add capability', <CapabilityFormDialog key="c" open mode="create" onClose={onClose} />, 'Create Capability'],
    ['Add product', <ProductFormDialog key="p" open mode="create" onClose={onClose} />, 'Create Product'],
    ['Add infrastructure', <InfrastructureFormDialog key="i" open mode="create" onClose={onClose} />, 'Register Infrastructure'],
    ['Add installation', <InstallationFormDialog key="n" open mode="create" onClose={onClose} />, 'Create Installation'],
  ])('%s places its primary action last in the footer', (name, node, primary) => {
    render(wrap(node));

    const dialog = screen.getByRole('dialog', { name: name as string });
    const footer = within(dialog).getByRole('button', { name: primary as string }).closest('.app-dialog-footer') as HTMLElement;
    const buttons = within(footer).getAllByRole('button').map((button) => button.textContent?.trim());
    expect(buttons).toEqual(['Cancel', primary]);
  });
});

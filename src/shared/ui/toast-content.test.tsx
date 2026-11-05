import { DToastProvider, useToast } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AssignProductDialog } from '../../features/client-products/components/assign-product-dialog';
import { ClientProductFeaturesDialog } from '../../features/client-products/components/client-product-features-dialog';
import { ClientProductLifecycleAction } from '../../features/client-products/components/client-product-lifecycle-action';
import type { ClientProductSummary } from '../../features/client-products/types/client-product';
import { ProductCommercialTab } from '../../features/commercial-catalog/components/product-commercial-tab';
import { InstallationFormDialog } from '../../features/installations/components/installation-form-dialog';
import { createMockInstallationDataSource } from '../../features/installations/data/mock-installation-data-source';
import { installationDataSource } from '../../features/installations/hooks/use-installations';
import { createMockProductDataSource } from '../../features/products/data/mock-product-data-source';

function wrap(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <DToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </DToastProvider>
    </QueryClientProvider>
  );
}

const relationship = {
  id: 'client-product-nova-pos',
  clientId: 'client-nova',
  productId: 'product-pos',
  productCode: 'POS',
  productName: 'Digvation POS',
  status: 'PROVISIONING',
} as unknown as ClientProductSummary;

describe('toast rendering', () => {
  it('shows the title and the description a call provides', async () => {
    function Raise() {
      const { showToast } = useToast();
      return <button onClick={() => showToast({ title: 'Saved title', description: 'Saved detail', variant: 'success' })}>Raise</button>;
    }
    render(wrap(<Raise />));

    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));

    expect(await screen.findByText('Saved title')).toBeVisible();
    expect(screen.getByText('Saved detail')).toBeVisible();
  });
});

describe('toast content of each flow', () => {
  it('set price', async () => {
    const detail = await createMockProductDataSource().getProductDetail('product-pos');
    render(wrap(<ProductCommercialTab detail={detail!} />));

    const [setPrice] = await screen.findAllByRole('button', { name: 'Set price' });
    await waitFor(() => expect(setPrice).toBeEnabled());
    fireEvent.click(setPrice);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /currency/i }), { target: { value: 'IDR' } });
    fireEvent.submit(dialog.querySelector('#catalog-price-form') as HTMLFormElement);

    expect(await screen.findByText('Product list price updated')).toBeVisible();
  });

  it('activate', async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    render(
      wrap(
        <ClientProductLifecycleAction
          clientProduct={relationship}
          canBecomeEffective
          isSubmitting={false}
          onTransition={onTransition}
        />,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /reason/i }), { target: { value: 'Contract signed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Product status updated')).toBeVisible();
    expect(screen.getByText('Digvation POS is now active.')).toBeVisible();
  });

  it('assign', async () => {
    render(wrap(<AssignProductDialog clientId="client-leaf" open onClose={vi.fn()} />));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(await within(dialog).findByRole('button', { name: /^Product/ }));
    fireEvent.click((await screen.findAllByRole('option'))[0]);
    const assign = within(dialog).getByRole('button', { name: 'Assign product' });
    await waitFor(() => expect(assign).toBeEnabled());
    fireEvent.click(assign);

    expect(await screen.findByText('Product assigned')).toBeVisible();
    expect(screen.getAllByText('The product starts in provisioning.').length).toBeGreaterThan(0);
  });

  it('save features', async () => {
    render(wrap(<ClientProductFeaturesDialog relationship={relationship} open onClose={vi.fn()} />));
    const dialog = await screen.findByRole('dialog');

    const save = await within(dialog).findByRole('button', { name: 'Save' });
    fireEvent.click(save);

    expect(await screen.findByText('Product features updated')).toBeVisible();
    expect(screen.getByText('Digvation POS features were saved.')).toBeVisible();
  });

  it('edit installation', async () => {
    const source = createMockInstallationDataSource();
    for (const method of Object.keys(source) as (keyof typeof source)[]) {
      vi.spyOn(installationDataSource, method).mockImplementation(source[method] as never);
    }
    const { installations } = await source.getInstallations({
      search: '',
      status: 'ALL',
      environment: 'ALL',
      page: 1,
      limit: 50,
    });
    const installation = installations[0];
    render(wrap(<InstallationFormDialog open mode="edit" installation={installation} onClose={vi.fn()} />));
    await screen.findByText(installation.products[0].productName);

    fireEvent.change(screen.getByRole('textbox', { name: /^name/i }), { target: { value: 'Renamed installation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Installation updated')).toBeVisible();
    vi.restoreAllMocks();
  });
});

/**
 * Every other toast-raising action: each call site in the app must pass a title
 * that cannot be empty. Reads the source, so a new call site is covered too.
 */
describe('every toast call site', () => {
  const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
  const sites = Object.entries(sources)
    .filter(([path]) => !path.includes('.test.'))
    .flatMap(([path, source]) =>
      [...source.matchAll(/showToast\(\{\s*(title\b[^,]*)?/g)].map((match) => ({ path, title: match[1] ?? '' })),
    );

  it('finds the call sites', () => {
    expect(sites.length).toBeGreaterThan(50);
  });

  it('gives every toast a non-empty literal title', () => {
    const missing = sites.filter(({ title }) => {
      // A shorthand title is built from literals in the surrounding function.
      if (title.trim() === 'title') return false;
      const literals = [...title.matchAll(/(['"`])(.*?)\1/g)].map((match) => match[2].trim());
      return literals.length === 0 || literals.some((text) => text.length === 0);
    });
    expect(missing).toEqual([]);
  });
});

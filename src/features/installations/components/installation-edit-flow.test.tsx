import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockInstallationDataSource } from '../data/mock-installation-data-source';
import { installationDataSource } from '../hooks/use-installations';
import { InstallationListPage } from '../pages/installation-list-page';
import type { InstallationSummary } from '../types/installation';
import { InstallationDetailDialog } from './installation-detail-dialog';
import { InstallationFormDialog } from './installation-form-dialog';

const DOMAIN_CONFLICT = 'Client already serves POS from installation NOVA-PROD in PRODUCTION';
const BINDING_CONFLICT = 'A product with an active runtime binding on this installation cannot be unbound';

let baseInstallation: InstallationSummary;

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <DToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </DToastProvider>
    </QueryClientProvider>
  );
}

function serve(overrides: Partial<InstallationSummary>) {
  const installation = { ...baseInstallation, ...overrides };
  vi.spyOn(installationDataSource, 'getInstallations').mockResolvedValue({
    installations: [installation],
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(installationDataSource, 'getInstallation').mockResolvedValue(installation);
  return installation;
}

const shared = (): Partial<InstallationSummary> => ({
  status: 'ACTIVE',
  deploymentMode: 'SHARED',
  branding: { mode: 'DIGVATION' },
});

async function openRowActions() {
  const trigger = await waitFor(() => {
    const element = screen
      .getByRole('table')
      .querySelector<HTMLElement>('tbody [data-ds-component="dropdown-trigger"] > *');
    expect(element).not.toBeNull();
    return element!;
  });
  fireEvent.click(trigger);
}

async function renderEditForm(installation: InstallationSummary) {
  render(
    withProviders(
      <InstallationFormDialog open mode="edit" installation={installation} onClose={() => undefined} />,
    ),
  );
  await screen.findByText(installation.products[0].productName);
}

function saveChanges() {
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
}

async function saveErrorAlert() {
  return within(screen.getByRole('dialog')).findByRole('alert');
}

// The Nova mock installation delivers both of its client's products, so
// removing one is the available change to the product set.
function uncheckFirstProduct() {
  const checked = within(screen.getByRole('dialog'))
    .getAllByRole('checkbox')
    .find((box) => (box as HTMLInputElement).checked);
  expect(checked).toBeDefined();
  fireEvent.click(checked!);
}

beforeEach(async () => {
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
  baseInstallation = installations[0];
});

afterEach(() => vi.restoreAllMocks());

describe('Edit availability', () => {
  it('offers Edit in the list for an active installation', async () => {
    serve({ status: 'ACTIVE' });
    render(withProviders(<InstallationListPage />));
    await openRowActions();

    expect(await screen.findByRole('button', { name: 'Edit Installation' })).toBeInTheDocument();
  });

  it('removes Edit from the list for a decommissioned installation and keeps Open', async () => {
    serve({ status: 'DECOMMISSIONED' });
    render(withProviders(<InstallationListPage />));
    await openRowActions();

    expect(await screen.findByRole('button', { name: 'Open Installation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Installation' })).not.toBeInTheDocument();
  });

  it('removes Edit from the detail dialog for a decommissioned installation and explains why', async () => {
    const installation = serve({ status: 'DECOMMISSIONED' });
    render(
      withProviders(
        <InstallationDetailDialog installationId={installation.id} open onClose={() => undefined} />,
      ),
    );

    expect(await screen.findByText(/can no longer be edited/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Installation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('keeps Edit in the detail dialog for an active installation, without the note', async () => {
    const installation = serve({ status: 'ACTIVE' });
    render(
      withProviders(
        <InstallationDetailDialog installationId={installation.id} open onClose={() => undefined} />,
      ),
    );

    expect(await screen.findByRole('button', { name: 'Edit Installation' })).toBeInTheDocument();
    expect(screen.queryByText(/can no longer be edited/)).not.toBeInTheDocument();
  });
});

describe('Saving an edit', () => {
  it('does not send products when the product set is unchanged', async () => {
    await renderEditForm(serve(shared()));
    saveChanges();

    expect(await screen.findByText('Installation updated')).toBeInTheDocument();
    expect(installationDataSource.updateInstallation).toHaveBeenCalledTimes(1);
    expect(installationDataSource.updateInstallationBranding).toHaveBeenCalledTimes(1);
    expect(installationDataSource.replaceInstallationProducts).not.toHaveBeenCalled();
  });

  it('sends products when the product set changed', async () => {
    await renderEditForm(serve(shared()));
    uncheckFirstProduct();
    saveChanges();

    await waitFor(() =>
      expect(installationDataSource.replaceInstallationProducts).toHaveBeenCalledTimes(1),
    );
  });

  it('shows the CORE domain conflict when nothing was saved yet', async () => {
    vi.spyOn(installationDataSource, 'updateInstallation').mockRejectedValue(new Error(DOMAIN_CONFLICT));
    await renderEditForm(serve(shared()));
    saveChanges();

    const alert = await saveErrorAlert();
    expect(alert).toHaveTextContent('Installation update failed');
    expect(alert).toHaveTextContent(DOMAIN_CONFLICT);
    expect(alert).not.toHaveTextContent('were saved');
    expect(installationDataSource.updateInstallationBranding).not.toHaveBeenCalled();
  });

  it('says branding was kept when a dedicated edit hits the domain conflict', async () => {
    vi.spyOn(installationDataSource, 'updateInstallation').mockRejectedValue(new Error(DOMAIN_CONFLICT));
    await renderEditForm(serve({ status: 'ACTIVE' }));
    saveChanges();

    const alert = await saveErrorAlert();
    expect(alert).toHaveTextContent('Installation partly updated');
    expect(alert).toHaveTextContent(`${DOMAIN_CONFLICT}. Your other changes in this form were saved.`);
  });

  it('says other changes were saved when the product binding conflict follows them', async () => {
    vi.spyOn(installationDataSource, 'replaceInstallationProducts').mockRejectedValue(new Error(BINDING_CONFLICT));
    await renderEditForm(serve(shared()));
    uncheckFirstProduct();
    saveChanges();

    const alert = await saveErrorAlert();
    expect(alert).toHaveTextContent('Installation partly updated');
    expect(alert).toHaveTextContent(`${BINDING_CONFLICT}. Your other changes in this form were saved.`);
    expect(screen.queryByText('Installation updated')).not.toBeInTheDocument();
  });

  it('clears the error when the next save succeeds', async () => {
    vi.spyOn(installationDataSource, 'updateInstallation').mockRejectedValueOnce(new Error(DOMAIN_CONFLICT));
    await renderEditForm(serve(shared()));
    saveChanges();
    await saveErrorAlert();

    saveChanges();

    expect(await screen.findByText('Installation updated')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument();
  });
});

import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { InvitationFormDialog } from '../../features/access/components/access-dialogs';
import { CapabilityForm } from '../../features/capabilities/components/capability-form';
import { AssignProductDialog } from '../../features/client-products/components/assign-product-dialog';
import { ClientForm } from '../../features/clients/components/client-form';
import { CatalogPriceDialog } from '../../features/commercial-catalog/components/catalog-price-dialog';
import { AddOnOfferingDialog } from '../../features/commercial-catalog/components/add-on-offering-dialog';
import { InfrastructureForm } from '../../features/infrastructure/components/infrastructure-form';
import { InstallationBindingDialog } from '../../features/infrastructure/components/installation-binding-dialog';
import { InstallationForm } from '../../features/installations/components/installation-form';
import { InstallationActionRequest } from '../../features/operations/components/installation-action-request';
import { ProductFeatureForm } from '../../features/products/components/product-feature-form';
import { ProductForm } from '../../features/products/components/product-form';
import { InitialSubscriptionDialog } from '../../features/subscriptions/components/subscription-term-dialogs';
import { CoreApiError } from '../http/core-api-client';
import { AppInput } from '../ui/form-fields';
import { useValidatedForm } from './use-validated-form';

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

function submitForm(formId: string) {
  fireEvent.submit(document.getElementById(formId) as HTMLFormElement);
}

async function expectFieldError(field: HTMLElement) {
  await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
  const describedBy = field.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  expect(document.getElementById(describedBy as string)?.textContent).toBeTruthy();
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('schema-backed forms', () => {
  const noop = vi.fn();

  it.each([
    [
      'client',
      <ClientForm key="c" formId="f" mode="create" defaultValues={{ code: '', displayName: '' } as never} onSubmit={noop} />,
      'Client code',
    ],
    [
      'capability',
      <CapabilityForm key="c" formId="f" mode="create" defaultValues={{ code: '', name: '' } as never} onSubmit={noop} />,
      'Capability code',
    ],
    [
      'product',
      <ProductForm key="p" formId="f" mode="create" defaultValues={{ code: '', name: '' } as never} onSubmit={noop} />,
      'Product code',
    ],
    [
      'product feature',
      <ProductFeatureForm key="pf" formId="f" mode="create" defaultValues={{ code: '', name: '' } as never} onSubmit={noop} />,
      'Feature code',
    ],
    [
      'infrastructure',
      <InfrastructureForm key="i" formId="f" mode="create" defaultValues={{ code: '', name: '', provider: '', ownership: 'DIGVATION', lifecycleStatus: 'REGISTERED', managedByDigvation: true } as never} onSubmit={noop} />,
      'Infrastructure code',
    ],
  ])('%s shows the error on blur, and focuses the first invalid field on submit', async (_name, form, firstLabel) => {
    render(wrap(form));
    const first = screen.getByLabelText(firstLabel as string);
    expect(first).not.toHaveAttribute('aria-invalid');

    fireEvent.blur(first);
    await expectFieldError(first);

    submitForm('f');
    await waitFor(() => expect(first).toHaveFocus());
    expect(noop).not.toHaveBeenCalled();
  });

  it('installation shows schema errors on submit', async () => {
    render(wrap(
      <InstallationForm
        formId="f"
        mode="create"
        defaultValues={{ clientId: '', clientProductIds: [], code: '', name: '', environment: 'PRODUCTION', deploymentMode: 'SHARED', infrastructureOwnership: 'DIGVATION', managedByDigvation: true, brandingMode: 'DIGVATION' } as never}
        onSubmit={noop}
      />,
    ));

    submitForm('f');

    await expectFieldError(screen.getByLabelText('Installation code'));
  });
});

describe('state-backed forms', () => {
  it('invitation requires an email and a role on submit', async () => {
    render(wrap(<InvitationFormDialog roles={[{ id: 'r', name: 'Support' }] as never} onClose={vi.fn()} />));

    submitForm('access-invitation-form');

    await expectFieldError(screen.getByLabelText('Email'));
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
  });

  it('catalog price rejects a bad currency on blur', async () => {
    render(wrap(<CatalogPriceDialog title="Set price" open loading={false} onClose={vi.fn()} onSubmit={vi.fn()} />));
    const currency = screen.getByLabelText('Currency');

    fireEvent.change(currency, { target: { value: 'ID' } });
    fireEvent.blur(currency);

    await expectFieldError(currency);
  });

  it('add-on offering requires its code and name, and does not submit', async () => {
    const onCreate = vi.fn();
    render(wrap(<AddOnOfferingDialog productId="p" open loading={false} onClose={vi.fn()} onCreate={onCreate} onUpdate={vi.fn()} />));

    submitForm('add-on-offering-form');

    await expectFieldError(screen.getByLabelText('Code'));
    await expectFieldError(screen.getByLabelText('Name'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('subscription setup requires a list price for its billing cycle', async () => {
    const summary = { clientProductId: 'cp', productId: 'p', productName: 'POS', productCode: 'POS', terms: [], addOns: [], configurations: [] } as never;
    render(wrap(<InitialSubscriptionDialog summary={summary} clientId="c" onClose={vi.fn()} />));

    submitForm('initial-subscription-form');

    await expectFieldError(screen.getByLabelText('Currency'));
  });

  it('action request requires a reason instead of a toast', async () => {
    render(wrap(<InstallationActionRequest installationId="i" installationName="Nova" />));
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Record request' }));

    await expectFieldError(within(dialog).getByLabelText('Reason'));
  });

  it('assign product requires a product once products are loaded', async () => {
    render(wrap(<AssignProductDialog clientId="client-leaf" open onClose={vi.fn()} />));

    const dialog = await screen.findByRole('dialog');
    const assign = within(dialog).getByRole('button', { name: 'Assign product' });
    await waitFor(() => expect(assign).toBeEnabled());
    fireEvent.click(assign);

    await waitFor(() => expect(within(dialog).getByText('Select a product.')).toBeInTheDocument());
  });

  it('installation binding requires an installation', async () => {
    render(wrap(<InstallationBindingDialog nodeId="n" open onClose={vi.fn()} />));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Bind installation' }));

    await waitFor(() => expect(within(dialog).getByText('Select an installation.')).toBeInTheDocument());
  });
});

describe('server validation errors', () => {
  const schema = z.object({ displayName: z.string(), notes: z.string().optional() });

  function ServerForm({ error }: { error: unknown }) {
    const { field, form, applyServerError } = useValidatedForm<{ displayName: string; notes?: string }>({
      formId: 'server',
      schema,
      defaultValues: { displayName: 'Nova', notes: '' },
    });
    return (
      <form id="server" onSubmit={form.handleSubmit(() => applyServerError(error))}>
        <AppInput {...field('displayName')} label="Display name" />
        <AppInput {...field('notes')} label="Notes" />
      </form>
    );
  }

  it('puts a message on the field the API names', async () => {
    const error = new CoreApiError('Request validation failed', 400, 'VALIDATION', ['display_name must be shorter than 150 characters']);
    render(<ServerForm error={error} />);

    await act(async () => submitForm('server'));

    await expectFieldError(screen.getByLabelText('Display name'));
    expect(screen.getByText('display_name must be shorter than 150 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).not.toHaveAttribute('aria-invalid');
  });

  it('leaves fields alone when the API names none of them', async () => {
    const error = new CoreApiError('Conflict', 409);
    render(<ServerForm error={error} />);

    await act(async () => submitForm('server'));

    expect(screen.getByLabelText('Display name')).not.toHaveAttribute('aria-invalid');
  });
});

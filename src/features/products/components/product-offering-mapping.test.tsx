import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailDialog } from './product-detail-dialog';

vi.mock('../../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

const VOCABULARY = {
  domains: [
    { code: 'INVENTORY', served: false },
    { code: 'POS', served: true },
    { code: 'WORKSHOP', served: false },
  ],
  applications: [
    { code: 'OPERATIONAL_APP', grantable: true, implicit: false },
    { code: 'POS_SALON_APP', grantable: true, implicit: false },
    { code: 'BACKOFFICE', grantable: false, implicit: true },
  ],
};
const TAX = {
  capability_id: 'tax',
  code: 'TAX_FISCAL',
  name: 'Tax',
  description: null,
  status: 'ACTIVE',
};
const PROMOTIONS = { ...TAX, capability_id: 'promotions', code: 'PROMOTIONS', name: 'Promotions' };
const RETIRED = {
  ...TAX,
  capability_id: 'customers',
  code: 'CUSTOMER_MANAGEMENT',
  name: 'Customer management',
  status: 'RETIRED',
};
const catalogItem = ({ capability_id, ...rest }: typeof TAX) => ({
  ...rest,
  id: capability_id,
  product_count: 0,
  client_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offering',
    code: 'POS_SALON',
    name: 'POS Salon',
    description: null,
    status: 'DRAFT',
    status_changed_at: '2026-01-01T00:00:00Z',
    feature_count: 0,
    client_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    features: [],
    capabilities: [],
    domain_codes: [],
    application_codes: [],
    ...overrides,
  };
}

const fetchMock = vi.fn<typeof fetch>();
type Failure = { status: number; message: string };
interface Harness {
  detail: ReturnType<typeof product>;
  permissions?: { roles: string[]; permissions: string[] } | Failure;
  failures?: Record<string, Failure>;
  /** Fail every product read after the first write, as an overloaded CORE did locally. */
  failReadsAfterWrite?: boolean;
  wrote?: boolean;
}

function respond(status: number, data: unknown, message?: string) {
  const body =
    status < 400
      ? { success: true, data }
      : { success: false, error: { code: 'E', message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function route(harness: Harness) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const failure = harness.failures?.[key];
    if (failure) return respond(failure.status, null, failure.message);
    if (key === 'GET /authorization/me') {
      const answer = harness.permissions ?? { roles: ['SUPER_ADMIN'], permissions: [] };
      return 'status' in answer
        ? respond(answer.status, null, answer.message)
        : respond(200, answer);
    }
    if (key === 'GET /products/mapping-vocabulary') return respond(200, VOCABULARY);
    if (key === 'GET /products/offering')
      return harness.failReadsAfterWrite && harness.wrote
        ? respond(500, null, 'Internal server error')
        : respond(200, harness.detail);
    if (init?.method && init.method !== 'GET') harness.wrote = true;
    if (key === 'PATCH /products/offering') {
      const body = JSON.parse(String(init?.body)) as Record<string, string[]>;
      harness.detail = { ...harness.detail, ...body };
      return respond(200, { product_id: 'offering' });
    }
    if (key === 'PATCH /products/offering/status') {
      const body = JSON.parse(String(init?.body)) as { target_status: string };
      harness.detail = { ...harness.detail, status: body.target_status };
      return respond(200, { product_id: 'offering' });
    }
    if (key === 'PUT /products/offering/capabilities') return respond(200, {});
    if (key === 'GET /capabilities')
      return respond(200, {
        items: [TAX, PROMOTIONS, RETIRED].map(catalogItem),
        pagination: { page: 1, limit: 100, total: 3, total_pages: 1 },
      });
    return respond(200, { items: [], pagination: { page: 1, limit: 100, total: 0, total_pages: 1 } });
  });
}

function bodiesOf(method: string, path: string) {
  return fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? 'GET') === method && new URL(String(input)).pathname === path)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

function countOf(path: string) {
  return fetchMock.mock.calls.filter(([input]) => new URL(String(input)).pathname === path).length;
}

function renderDialog(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={client}>
      <DToastProvider>
        <MemoryRouter>
          <ProductDetailDialog productId="offering" open onClose={() => undefined} />
        </MemoryRouter>
      </DToastProvider>
    </QueryClientProvider>,
  );
}

const section = async () =>
  (await screen.findByRole('heading', { name: 'What this offering grants' })).closest('section') as HTMLElement;

async function openGrantsEditor() {
  fireEvent.click(await within(await section()).findByRole('button', { name: 'Edit grants' }));
  return within(await section());
}

async function openCapabilities() {
  fireEvent.click(await screen.findByRole('tab', { name: 'Capabilities' }));
}

async function openCapabilityEditor() {
  await openCapabilities();
  await screen.findByText('Capabilities', { selector: 'strong' });
  const tab = screen.getByText('Capabilities', { selector: 'strong' }).closest('.product-capability-section') as HTMLElement;
  fireEvent.click(within(tab).getByRole('button', { name: 'Edit' }));
}

async function openLifecycleMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'More' }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
});
afterEach(() => vi.unstubAllGlobals());

describe('what an offering grants', () => {
  it('shows labels with codes, an unserved domain, and Backoffice as read-only', async () => {
    route({
      detail: product({
        status: 'ACTIVE',
        domain_codes: ['POS', 'WORKSHOP'],
        application_codes: ['POS_SALON_APP'],
      }),
    });
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByText('POS Salon app')).toBeInTheDocument();
    expect(grants.getByText('POS_SALON_APP')).toHaveClass('product-code');
    expect(grants.getByText('Workshop')).toBeInTheDocument();
    expect(grants.getAllByText('Not served by Runtime yet')).toHaveLength(1);
    expect(grants.getByText('Backoffice')).toBeInTheDocument();
    expect(grants.getByText('Included with every active offering')).toBeInTheDocument();
  });

  it('marks empty grants Not set and says a domain is needed', async () => {
    route({ detail: product() });
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByText('Not set')).toBeInTheDocument();
    expect(await grants.findByText('Operational apps not set')).toBeInTheDocument();
    expect(grants.getByText('Add a domain before activating this offering.')).toBeInTheDocument();
  });

  it('saves domains and applications through PATCH, never sending Backoffice', async () => {
    route({ detail: product({ application_codes: ['OPERATIONAL_APP'] }) });
    renderDialog();
    const form = await openGrantsEditor();

    expect(form.queryByRole('checkbox', { name: 'Backoffice' })).not.toBeInTheDocument();
    expect(form.getByText('Included with every active offering')).toBeInTheDocument();
    expect(form.getAllByText('Not served by Runtime yet')).toHaveLength(2);
    fireEvent.click(form.getByRole('checkbox', { name: 'POS' }));
    fireEvent.click(form.getByRole('checkbox', { name: 'POS Salon app' }));
    fireEvent.click(form.getByRole('button', { name: 'Save grants' }));

    await screen.findByText('Grants updated');
    const [body] = bodiesOf('PATCH', '/products/offering');
    expect(body).toEqual({
      domain_codes: ['POS'],
      application_codes: ['OPERATIONAL_APP', 'POS_SALON_APP'],
    });
  });

  it('keeps Save off until something changes and Cancel leaves saved grants alone', async () => {
    route({ detail: product({ domain_codes: ['POS'] }) });
    renderDialog();
    const form = await openGrantsEditor();

    expect(form.getByRole('button', { name: 'Save grants' })).toBeDisabled();
    fireEvent.click(form.getByRole('checkbox', { name: 'POS Salon app' }));
    expect(form.getByRole('button', { name: 'Save grants' })).toBeEnabled();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    expect(await within(await section()).findByRole('button', { name: 'Edit grants' })).toBeInTheDocument();
    expect(bodiesOf('PATCH', '/products/offering')).toHaveLength(0);
  });

  it('refuses to remove the last domain of an active offering without calling CORE', async () => {
    route({ detail: product({ status: 'ACTIVE', domain_codes: ['POS'] }) });
    renderDialog();
    const form = await openGrantsEditor();

    expect(form.getByText(/CORE blocks these changes while clients hold it/)).toBeInTheDocument();
    const pos = form.getByRole('checkbox', { name: 'POS' });
    fireEvent.click(pos);
    fireEvent.click(form.getByRole('button', { name: 'Save grants' }));

    const error = await form.findByText('An active offering needs at least one domain.');
    expect(pos).toHaveAttribute('aria-invalid', 'true');
    expect(pos.getAttribute('aria-describedby')).toBe(error.id);
    await waitFor(() => expect(form.getByRole('checkbox', { name: 'Inventory' })).toHaveFocus());
    expect(bodiesOf('PATCH', '/products/offering')).toHaveLength(0);
  });

  it.each([
    [409, 'Offering mapping change would alter 2 client product(s) holding this active product; transition them explicitly before changing the mapping'],
    [409, 'Granting WORKSHOP would make a client serve it from installations a, b in production'],
    [409, 'Active product POS must keep at least one domain grant'],
    [400, 'BACKOFFICE is granted implicitly with any active offering and cannot be a product application grant'],
    [400, 'Unknown domain code(s): NOPE. Allowed: POS, WORKSHOP, INVENTORY'],
  ])('shows a %i from CORE inside the form and stays open', async (status, message) => {
    route({
      detail: product({ domain_codes: ['POS'] }),
      failures: { 'PATCH /products/offering': { status, message } },
    });
    renderDialog();
    const form = await openGrantsEditor();

    fireEvent.click(form.getByRole('checkbox', { name: 'Workshop' }));
    fireEvent.click(form.getByRole('button', { name: 'Save grants' }));

    expect(await form.findByRole('alert')).toHaveTextContent(message);
    expect(form.getByRole('button', { name: 'Save grants' })).toBeInTheDocument();
  });

  it('fetches the vocabulary once per session, even after a save and a reopen', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    route({ detail: product() });
    const first = renderDialog(client);
    const form = await openGrantsEditor();
    fireEvent.click(form.getByRole('checkbox', { name: 'POS' }));
    fireEvent.click(form.getByRole('button', { name: 'Save grants' }));
    await screen.findByText('Grants updated');
    first.unmount();

    renderDialog(client);
    await within(await section()).findByText('Backoffice');

    expect(countOf('/products/mapping-vocabulary')).toBe(1);
  });

  it('offers a retry when the vocabulary cannot load', async () => {
    const harness: Harness = {
      detail: product({ domain_codes: ['POS'] }),
      failures: { 'GET /products/mapping-vocabulary': { status: 500, message: 'Down' } },
    };
    route(harness);
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(grants.getByRole('button', { name: 'Edit grants' })).toBeDisabled();
    harness.failures = {};
    fireEvent.click(grants.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(grants.getByRole('button', { name: 'Edit grants' })).toBeEnabled());
  });
});

describe('activation', () => {
  it('disables Activate with a visible reason when there is no domain', async () => {
    route({ detail: product() });
    renderDialog();
    await openLifecycleMenu();

    const activate = await screen.findByRole('menuitem', { name: /Activate/ });
    expect(activate).toBeDisabled();
    expect(activate).toHaveTextContent('Add a domain first');
  });

  it('activates once a domain is granted', async () => {
    route({ detail: product({ domain_codes: ['POS'] }) });
    renderDialog();
    await openLifecycleMenu();

    const activate = await screen.findByRole('menuitem', { name: 'Activate' });
    expect(activate).toBeEnabled();
    fireEvent.click(activate);
    const dialog = within(await screen.findByRole('dialog', { name: 'Change product status' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'Ready' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));

    await screen.findByText('Product status updated');
    expect(bodiesOf('PATCH', '/products/offering/status')[0]).toEqual({
      target_status: 'ACTIVE',
      reason: 'Ready',
    });
  });

  it('shows CORE refusing activation as a form-level error', async () => {
    const message = 'Product POS_SALON needs a domain grant before it can be activated';
    route({
      detail: product({ domain_codes: ['POS'] }),
      failures: { 'PATCH /products/offering/status': { status: 409, message } },
    });
    renderDialog();
    await openLifecycleMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Change product status' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'Ready' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('dialog', { name: 'Change product status' })).toBeInTheDocument();
  });
});

describe('capability inclusion', () => {
  const linked = {
    capabilities: [
      { ...TAX, inclusion: 'INCLUDED' },
      { ...PROMOTIONS, inclusion: 'COMPATIBLE' },
    ],
  };

  it('shows Included or Compatible and what they mean', async () => {
    route({ detail: product(linked) });
    renderDialog();
    await openCapabilities();

    const tax = (await screen.findByText('TAX_FISCAL')).closest('.product-capability-row') as HTMLElement;
    const promotions = screen.getByText('PROMOTIONS').closest('.product-capability-row') as HTMLElement;
    expect(within(tax).getByText('Included')).toBeInTheDocument();
    expect(within(promotions).getByText('Compatible')).toBeInTheDocument();
    expect(screen.getByText(/Included is granted with the offering\. Compatible can be granted separately or through an add-on\./)).toBeInTheDocument();
  });

  it('sends the switched set through PUT with included_capability_ids', async () => {
    route({ detail: product(linked) });
    renderDialog();
    await openCapabilityEditor();

    const group = await screen.findByRole('radiogroup', { name: 'How Promotions is granted' });
    fireEvent.click(within(group).getByRole('radio', { name: 'Included' }));
    fireEvent.click(within(await screen.findByRole('radiogroup', { name: 'How Tax is granted' })).getByRole('radio', { name: 'Compatible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Capability compatibility updated');
    const [body] = bodiesOf('PUT', '/products/offering/capabilities');
    expect((body.capability_ids as string[]).sort()).toEqual(['promotions', 'tax']);
    expect(body.included_capability_ids).toEqual(['promotions']);
  });

  it('drops a capability from Included when it is unlinked, and offers no control for it', async () => {
    route({ detail: product(linked) });
    renderDialog();
    await openCapabilityEditor();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Allow Tax' }));
    expect(screen.queryByRole('radiogroup', { name: 'How Tax is granted' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Capability compatibility updated');
    const [body] = bodiesOf('PUT', '/products/offering/capabilities');
    expect(body).toEqual({ capability_ids: ['promotions'], included_capability_ids: [] });
  });

  it('does not let a retired capability become Included', async () => {
    route({ detail: product({ capabilities: [{ ...RETIRED, inclusion: 'COMPATIBLE' }] }) });
    renderDialog();
    await openCapabilityEditor();

    const group = within(await screen.findByRole('radiogroup', { name: 'How Customer management is granted' }));
    expect(group.getByRole('radio', { name: 'Included' })).toBeDisabled();
    expect(group.getByRole('radio', { name: 'Compatible' })).toBeChecked();
    expect(screen.getByText('Retired capabilities cannot be Included.')).toBeInTheDocument();
  });

  it('lets an already Included retired capability move to Compatible', async () => {
    route({ detail: product({ capabilities: [{ ...RETIRED, inclusion: 'INCLUDED' }] }) });
    renderDialog();
    await openCapabilityEditor();

    const group = within(await screen.findByRole('radiogroup', { name: 'How Customer management is granted' }));
    expect(group.getByRole('radio', { name: 'Included' })).toBeEnabled();
    fireEvent.click(group.getByRole('radio', { name: 'Compatible' }));
    expect(group.getByRole('radio', { name: 'Included' })).toBeDisabled();
  });

  it.each([
    'Retired capabilities cannot be assigned to a product catalog',
    'Offering mapping change would alter 1 client product(s) holding this active product; transition them explicitly before changing the mapping',
    'Included capabilities must be part of the compatibility set',
  ])('shows "%s" inside the tab', async (message) => {
    route({
      detail: product(linked),
      failures: { 'PUT /products/offering/capabilities': { status: 409, message } },
    });
    renderDialog();
    await openCapabilityEditor();

    await screen.findByRole('radiogroup', { name: 'How Tax is granted' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('is read-only without products.update or lifecycle permission', async () => {
    route({
      detail: product({ domain_codes: ['POS'], capabilities: [{ ...TAX, inclusion: 'INCLUDED' }] }),
      permissions: { roles: ['MEMBER'], permissions: ['products.read'] },
    });
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByText('Changing this needs the Update permission under Products.')).toBeInTheDocument();
    expect(grants.queryByRole('button', { name: 'Edit grants' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    await openCapabilities();
    expect(await screen.findByText('Included')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('lets products.update edit grants without offering activation', async () => {
    route({
      detail: product(),
      permissions: { roles: ['MEMBER'], permissions: ['products.read', 'products.update'] },
    });
    renderDialog();

    expect(await within(await section()).findByRole('button', { name: 'Edit grants' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });

  it('lets products.lifecycle.manage change status without offering edits', async () => {
    route({
      detail: product({ domain_codes: ['POS'] }),
      permissions: { roles: ['MEMBER'], permissions: ['products.read', 'products.lifecycle.manage'] },
    });
    renderDialog();

    expect(await screen.findByRole('button', { name: 'More' })).toBeInTheDocument();
    expect(within(await section()).queryByRole('button', { name: 'Edit grants' })).not.toBeInTheDocument();
  });

  it('offers no edit controls when permissions cannot be read', async () => {
    route({
      detail: product({ domain_codes: ['POS'] }),
      permissions: { status: 500, message: 'Down' },
    });
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByText('Changing this needs the Update permission under Products.')).toBeInTheDocument();
    expect(grants.queryByRole('button', { name: 'Edit grants' })).not.toBeInTheDocument();
  });

  it('offers nothing to edit on a retired offering', async () => {
    route({ detail: product({ status: 'RETIRED', domain_codes: ['POS'] }) });
    renderDialog();
    const grants = within(await section());

    expect(await grants.findByText('Retired products cannot be edited.')).toBeInTheDocument();
    expect(grants.queryByRole('button', { name: 'Edit grants' })).not.toBeInTheDocument();
  });
});

describe('a saved change whose read-back fails', () => {
  const stale = 'This offering may be out of date. Saved changes were kept, but the latest version could not be loaded.';

  it('reports activation as done and marks the detail out of date, with a reload', async () => {
    const harness: Harness = { detail: product({ domain_codes: ['POS'] }), failReadsAfterWrite: true };
    route(harness);
    renderDialog();
    await openLifecycleMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Change product status' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'Ready' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));

    await screen.findByText('Product status updated');
    expect(await screen.findByText(stale)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change product status' })).not.toBeInTheDocument());
    expect(screen.queryByText('Product unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Internal server error')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What this offering grants' })).toBeInTheDocument();

    harness.failReadsAfterWrite = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(screen.queryByText(stale)).not.toBeInTheDocument());
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('reports saved grants as done, without a form error', async () => {
    route({ detail: product({ domain_codes: ['POS'] }), failReadsAfterWrite: true });
    renderDialog();
    const form = await openGrantsEditor();
    fireEvent.click(form.getByRole('checkbox', { name: 'POS Salon app' }));
    fireEvent.click(form.getByRole('button', { name: 'Save grants' }));

    await screen.findByText('Grants updated');
    expect(await screen.findByText(stale)).toBeInTheDocument();
    expect(within(await section()).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(await section()).getByRole('button', { name: 'Edit grants' })).toBeInTheDocument();
  });

  it('reports saved capabilities as done, without a tab error', async () => {
    route({
      detail: product({ capabilities: [{ ...TAX, inclusion: 'COMPATIBLE' }] }),
      failReadsAfterWrite: true,
    });
    renderDialog();
    await openCapabilityEditor();
    fireEvent.click(within(await screen.findByRole('radiogroup', { name: 'How Tax is granted' })).getByRole('radio', { name: 'Included' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Capability compatibility updated');
    expect(await screen.findByText(stale)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

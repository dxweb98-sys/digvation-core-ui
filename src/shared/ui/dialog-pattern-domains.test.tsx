import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  AuditDetailDialog,
  InvitationFormDialog,
  RoleDialog,
  UserDetailDialog,
} from '../../features/access/components/access-dialogs';
import { AddOnGrantsDialog } from '../../features/commercial-catalog/components/add-on-grants-dialog';
import { AddOnOfferingDialog } from '../../features/commercial-catalog/components/add-on-offering-dialog';
import { CatalogPriceDialog } from '../../features/commercial-catalog/components/catalog-price-dialog';
import { IncidentDetailDialog } from '../../features/operations/components/incident-detail-dialog';
import { SubscriptionAddOnDialog } from '../../features/subscriptions/components/subscription-add-on-dialog';
import { InitialSubscriptionDialog, RenewalDialog } from '../../features/subscriptions/components/subscription-term-dialogs';

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
const SUMMARY = {
  clientProductId: 'cp-1',
  productId: 'product-1',
  productName: 'Digvation POS',
  productCode: 'POS',
  terms: [],
  addOns: [],
  configurations: [],
} as never;
const TERM = {
  id: 'term-1',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2027-01-01T00:00:00.000Z',
  renewalMode: 'MANUAL',
  renewalNoticeDays: 30,
};
const ACTIVE_SUMMARY = {
  ...(SUMMARY as object),
  subscription: { id: 'subscription-1', status: 'ACTIVE' },
  currentTerm: TERM,
  latestTerm: TERM,
  terms: [TERM],
} as never;
const OFFERING = {
  id: 'offering-1',
  productId: 'product-1',
  code: 'EXTRA',
  name: 'Extra seats',
  status: 'DRAFT',
  grants: [],
  featureGrants: [],
  capabilityGrants: [],
} as never;

function footerButtons(dialog: HTMLElement) {
  const footer = dialog.querySelector('.app-dialog-footer') as HTMLElement;
  return within(footer).getAllByRole('button').map((button) => button.textContent?.trim());
}

describe('access dialogs follow the shared pattern', () => {
  const user = {
    id: 'user-1',
    name: 'Rani Putri',
    email: 'rani@digvation.test',
    status: 'ACTIVE',
    roleIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as never;

  it('keeps the status change apart from close and save on the user dialog', () => {
    render(wrap(<UserDetailDialog user={user} roles={[]} onClose={onClose} />));

    const dialog = screen.getByRole('dialog', { name: 'Rani Putri' });
    expect(within(dialog).getByText('rani@digvation.test')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Deactivate' }).closest('.app-dialog-actions-destructive')).not.toBeNull();
    expect(footerButtons(dialog)).toEqual(['Deactivate', 'Close', 'Save roles']);
  });

  it('shows the audit result in the header and one empty mark for a missing reason', () => {
    const entry = {
      id: 'audit-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      actor: 'Operator',
      action: 'User deactivated',
      domain: 'Access',
      target: 'Rani Putri',
      result: 'SUCCESS',
    } as never;
    render(wrap(<AuditDetailDialog entry={entry} onClose={onClose} />));

    const dialog = screen.getByRole('dialog', { name: 'User deactivated' });
    expect(within(dialog).getByText('Success')).toBeInTheDocument();
    expect(within(dialog).getByText('Reason').nextElementSibling).toHaveTextContent('—');
  });

  it('keeps the invitation form and its actions', () => {
    render(wrap(<InvitationFormDialog roles={[]} onClose={onClose} />));

    const dialog = screen.getByRole('dialog', { name: 'Create invitation' });
    expect(dialog.querySelector('.app-dialog-footer')).not.toBeNull();
    expect(within(dialog).getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('keeps the role form in a wide dialog', () => {
    render(wrap(<RoleDialog assignedUserCount={0} onClose={onClose} />));

    expect(screen.getByRole('dialog', { name: 'Create role' })).toHaveClass('sm:max-w-4xl');
  });
});

describe('incident dialog follows the shared pattern', () => {
  it('moves severity, status, and code to the header and groups the details', async () => {
    const incident = {
      id: 'incident-1',
      code: 'INC-7',
      title: 'POS API restart loop',
      summary: 'Out of memory.',
      severity: 'CRITICAL',
      status: 'OPEN',
      clientId: 'client-nova',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as never;
    render(wrap(<IncidentDetailDialog incident={incident} open onClose={onClose} />));

    const dialog = await screen.findByRole('dialog', { name: 'POS API restart loop' });
    const code = within(dialog).getAllByText('INC-7').find((element) => element.classList.contains('app-dialog-identifier'));
    expect(code?.tagName).toBe('CODE');
    expect(within(dialog).getByRole('heading', { name: 'Incident' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Related operational actions' })).toBeInTheDocument();
    expect(within(dialog).getByText('Summary').closest('.app-detail-item-wide')).not.toBeNull();
  });
});

describe('subscription dialogs follow the shared pattern', () => {
  it.each([
    ['Set up Digvation POS subscription', <InitialSubscriptionDialog key="i" summary={SUMMARY} clientId="client-1" onClose={onClose} />],
    [/renew/i, <RenewalDialog key="r" summary={ACTIVE_SUMMARY} onClose={onClose} />],
    ['Add commercial add-on · Digvation POS', <SubscriptionAddOnDialog key="a" summary={ACTIVE_SUMMARY} onClose={onClose} />],
  ])('%s uses the form width and shared footer', (name, node) => {
    render(wrap(node));

    const dialog = screen.getByRole('dialog', { name });
    expect(dialog).toHaveClass('sm:max-w-2xl');
    expect(dialog.querySelector('.app-dialog-footer')).not.toBeNull();
  });
});

describe('catalog dialogs follow the shared pattern', () => {
  it('keeps the price form actions', () => {
    render(wrap(<CatalogPriceDialog title="Add price" open loading={false} onClose={onClose} onSubmit={vi.fn()} />));

    const dialog = screen.getByRole('dialog', { name: 'Add price' });
    expect(dialog).toHaveClass('sm:max-w-2xl');
    expect(footerButtons(dialog)[0]).toBe('Cancel');
  });

  it('keeps the offering form actions', () => {
    render(wrap(<AddOnOfferingDialog productId="product-1" open loading={false} onClose={onClose} onCreate={vi.fn()} onUpdate={vi.fn()} />));

    const dialog = screen.getByRole('dialog', { name: 'Create add-on offering' });
    expect(footerButtons(dialog)[0]).toBe('Cancel');
  });

  it('gives grants the wide dialog', () => {
    render(wrap(<AddOnGrantsDialog offering={OFFERING} features={[]} capabilities={[]} open loading={false} onClose={onClose} onSave={vi.fn()} />));

    expect(screen.getByRole('dialog', { name: 'Entitlement grants · Extra seats' })).toHaveClass('sm:max-w-4xl');
  });
});

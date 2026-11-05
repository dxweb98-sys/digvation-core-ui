import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AppDialog,
  DetailItem,
  DetailList,
  DialogActions,
  DialogSection,
} from './app-dialog';

describe('AppDialog', () => {
  it('names the dialog by its title and shows status, identifier, and meta in the header', () => {
    render(
      <AppDialog
        kind="detail"
        open
        onClose={vi.fn()}
        title="Nova Salon"
        status={<span>ACTIVE</span>}
        identifier="NOVA"
        meta="PT Nova"
      >
        body
      </AppDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Nova Salon' });
    expect(within(dialog).getByText('ACTIVE')).toBeInTheDocument();
    expect(within(dialog).getByText('NOVA').tagName).toBe('CODE');
    expect(within(dialog).getByText('PT Nova')).toBeInTheDocument();
  });

  it.each([
    ['confirm', 'sm:max-w-lg'],
    ['form', 'sm:max-w-2xl'],
    ['wide', 'sm:max-w-4xl'],
    ['detail', 'sm:max-w-4xl'],
  ] as const)('sizes a %s dialog from its kind', (kind, widthClass) => {
    render(<AppDialog kind={kind} open onClose={vi.fn()} title="Sized">body</AppDialog>);

    expect(screen.getByRole('dialog', { name: 'Sized' })).toHaveClass(widthClass);
  });

  it('renders a dialog that has no body content', () => {
    render(<AppDialog kind="confirm" open onClose={vi.fn()} title="Empty" footer={<button>Close</button>} />);

    expect(screen.getByRole('dialog', { name: 'Empty' })).toBeInTheDocument();
  });
});

describe('DialogActions', () => {
  it('orders destructive apart, then secondary, then primary last', () => {
    render(
      <DialogActions
        destructive={<button>Archive</button>}
        secondary={<button>Close</button>}
        primary={<button>Save</button>}
      />,
    );

    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Archive', 'Close', 'Save']);
    expect(screen.getByText('Archive').parentElement).toHaveClass('app-dialog-actions-destructive');
  });
});

describe('DetailItem', () => {
  it.each([[null], [undefined], ['']])('shows Not set for the empty value %s', (value) => {
    render(<DetailList><DetailItem label="Region">{value}</DetailItem></DetailList>);

    expect(screen.getByText('Region').nextElementSibling).toHaveTextContent('Not set');
  });

  it('keeps a zero and other real values', () => {
    render(<DetailList><DetailItem label="Incidents">{0}</DetailItem></DetailList>);

    expect(screen.getByText('Incidents').nextElementSibling).toHaveTextContent('0');
  });

  it('uses definition list semantics', () => {
    render(<DetailList><DetailItem label="Code">NOVA</DetailItem></DetailList>);

    expect(screen.getByText('Code').tagName).toBe('DT');
    expect(screen.getByText('NOVA').tagName).toBe('DD');
  });
});

describe('DialogSection', () => {
  it('heads a group with its title and description', () => {
    render(<DialogSection title="Contact" description="How to reach them.">content</DialogSection>);

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByText('How to reach them.')).toBeInTheDocument();
  });
});

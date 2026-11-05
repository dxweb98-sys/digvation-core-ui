import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { labelFor, transitionLabel } from '../labels/labels';
import { AppAction, AppIconAction } from './app-action';
import { DetailItem, DetailList } from './app-dialog';
import { AppInput, focusFirstInvalid } from './form-fields';
import { isEmptyValue, NotSet, valueOrNotSet } from './not-set';

describe('AppAction', () => {
  it.each([
    ['primary', 'app-action-primary'],
    ['secondary', 'app-action-secondary'],
    ['tertiary', 'app-action-tertiary'],
    ['danger', 'app-action-danger'],
    ['danger-subtle', 'app-action-danger-subtle'],
  ] as const)('renders the %s tone', (tone, className) => {
    render(<AppAction tone={tone}>Save</AppAction>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('app-action', className);
  });

  it('defaults to primary at the medium size', () => {
    render(<AppAction>Save</AppAction>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveClass('app-action-primary');
    expect(button.className).toContain('h-10');
  });

  it('shows an icon beside its text without adding to its name', () => {
    render(<AppAction icon={Plus}>Add client</AppAction>);

    const button = screen.getByRole('button', { name: 'Add client' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('passes button behavior and its ref through', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <AppAction disabled onClick={onClick} ref={ref} type="submit">
        Save
      </AppAction>,
    );

    expect(ref.current).toBeDisabled();
    expect(ref.current).toHaveAttribute('type', 'submit');
  });
});

describe('AppIconAction', () => {
  it('names itself from its label and has no visible text', () => {
    render(<AppIconAction icon={Plus} label="Edit Nova Salon" />);

    const button = screen.getByRole('button', { name: 'Edit Nova Salon' });
    expect(button).toHaveClass('app-icon-action');
    expect(button).toHaveTextContent('');
  });
});

describe('empty-value rule', () => {
  it.each([[null], [undefined], ['']])('treats %s as empty', (value) => {
    expect(isEmptyValue(value)).toBe(true);
  });

  it('keeps a zero and false as real values', () => {
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
  });

  it('shows "Not set" when a label sits beside it', () => {
    render(<DetailList><DetailItem label="Region">{null}</DetailItem></DetailList>);

    expect(screen.getByText('Region').nextElementSibling).toHaveTextContent('Not set');
  });

  it('names the field when no label sits beside it', () => {
    render(<NotSet field="Legal name" />);

    expect(screen.getByText('Legal name not set')).toHaveClass('not-set');
  });

  it('passes real values through', () => {
    expect(valueOrNotSet('Jakarta')).toBe('Jakarta');
  });
});

describe('labels', () => {
  it.each([
    ['WHITE_LABEL', 'White label'],
    ['PROVISIONING', 'Provisioning'],
    ['CO_TERM_PRORATED', 'Prorated to term end'],
    ['IN_PROGRESS', 'In progress'],
    ['REVERSE_PROXY', 'Reverse proxy'],
    ['DIGVATION', 'Digvation'],
  ])('maps %s', (value, label) => {
    expect(labelFor(value)).toBe(label);
  });

  it('still makes an unmapped constant readable', () => {
    expect(labelFor('SOME_NEW_STATE')).toBe('Some new state');
  });

  it('gives nothing for a missing value', () => {
    expect(labelFor(null)).toBe('');
    expect(labelFor(undefined)).toBe('');
  });

  it('names the action that moves into a status', () => {
    expect(transitionLabel('SUSPENDED')).toBe('Suspend');
    expect(transitionLabel('DRAFT')).toBe('Return to draft');
    expect(transitionLabel('ARCHIVED')).toBe('Archive');
  });
});

describe('form fields', () => {
  it('tags optional fields only', () => {
    render(
      <>
        <AppInput label="Legal name" optional />
        <AppInput label="Display name" />
      </>,
    );

    expect(screen.getByLabelText(/Legal name/)).toBeInTheDocument();
    expect(screen.getAllByText('Optional')).toHaveLength(1);
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('replaces the helper with the error and links it to the input', () => {
    render(<AppInput error="Enter a name." hint="Shown to operators." label="Name" />);

    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy as string)).toHaveTextContent('Enter a name.');
    expect(screen.queryByText('Shown to operators.')).not.toBeInTheDocument();
  });

  it('keeps the helper while valid', () => {
    render(<AppInput hint="Shown to operators." label="Name" />);

    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Shown to operators.')).toBeInTheDocument();
  });

  it('focuses the first invalid field that is not disabled', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    render(
      <form id="sample">
        <AppInput disabled error="Locked." label="Code" />
        <AppInput error="Enter a name." label="Name" />
      </form>,
    );

    focusFirstInvalid('sample');

    expect(screen.getByLabelText('Name')).toHaveFocus();
    vi.unstubAllGlobals();
  });
});

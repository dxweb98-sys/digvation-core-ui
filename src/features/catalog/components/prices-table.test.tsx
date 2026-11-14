import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../test/render-app';
import { openRowActions } from '../../../test/table';
import { PricesTable } from './prices-table';

const price = {
  id: 'price-1',
  billing_cycle: 'MONTHLY' as const,
  currency: 'IDR',
  amount: '150000000',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('list prices', () => {
  it('shows minor units as whole rupiah', () => {
    renderApp(<PricesTable prices={[price]} canManage={false} onSet={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getAllByText('Rp 1.500.000').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Set price' })).not.toBeInTheDocument();
  });

  it('prefills the change form in rupiah and sends minor units back', async () => {
    const onSet = vi.fn().mockResolvedValue(undefined);
    renderApp(<PricesTable prices={[price]} canManage onSet={onSet} onDelete={vi.fn()} />);

    await openRowActions(0);
    fireEvent.click(await screen.findByText('Change'));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByRole('textbox', { name: /list price/i });
    expect(amount).toHaveValue('1.500.000');

    fireEvent.change(amount, { target: { value: '2.000.000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));

    await waitFor(() =>
      expect(onSet).toHaveBeenCalledWith({ billing_cycle: 'MONTHLY', currency: 'IDR', amount: '200000000' }),
    );
  });
});

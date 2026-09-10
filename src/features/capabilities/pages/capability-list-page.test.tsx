import { QueryClientProvider } from '@tanstack/react-query';
import { DToastProvider } from '@digvation/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createApplicationQueryClient } from '../../../app/providers/query-client';
import { CapabilityListPage } from './capability-list-page';

function renderPage() {
  return render(
    <QueryClientProvider client={createApplicationQueryClient()}>
      <DToastProvider>
        <CapabilityListPage />
      </DToastProvider>
    </QueryClientProvider>,
  );
}

describe('CapabilityListPage', () => {
  it('exposes reusable capability catalog creation and detail management', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Capabilities' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Capability' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Capability' }));
    expect(
      screen.getByRole('dialog', { name: 'Add capability' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Capability Code *')).toBeInTheDocument();
    expect(screen.getByLabelText('Capability Name *')).toBeInTheDocument();
  });
});

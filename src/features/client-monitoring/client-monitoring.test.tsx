import { QueryClientProvider } from '@tanstack/react-query';
import { DToastProvider } from '@digvation/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createApplicationQueryClient } from '../../app/providers/query-client';
import { applicationRoutes } from '../../app/router/application-routes';
import { CLIENT_A_CONTEXT, CLIENT_B_CONTEXT, createMockClientMonitoringDataSource } from './data/mock-client-monitoring-data-source';

function renderClientMonitoring(path = '/client-monitoring') { const router = createMemoryRouter(applicationRoutes, { initialEntries: [path] }); return render(<QueryClientProvider client={createApplicationQueryClient()}><DToastProvider><RouterProvider router={router} /></DToastProvider></QueryClientProvider>); }

describe('client monitoring data boundary', () => {
  it('does not return Client B data when scoped to Client A', async () => { const data = await createMockClientMonitoringDataSource().getMonitoring(CLIENT_A_CONTEXT); expect(data.context.clientId).toBe(CLIENT_A_CONTEXT.clientId); expect(JSON.stringify(data)).toContain('Nova POS Production'); expect(JSON.stringify(data)).not.toContain('Poseidon Production'); });
  it('does not return Client A data when scoped to Client B', async () => { const data = await createMockClientMonitoringDataSource().getMonitoring(CLIENT_B_CONTEXT); expect(data.context.clientId).toBe(CLIENT_B_CONTEXT.clientId); expect(JSON.stringify(data)).toContain('Poseidon Production'); expect(JSON.stringify(data)).not.toContain('Nova POS Production'); });
  it('returns only the permitted installation scope for a client', async () => { const data = await createMockClientMonitoringDataSource().getMonitoring({ ...CLIENT_A_CONTEXT, permittedInstallationIds: ['installation-nova-pos-production'] }); expect(data.systems.map((system) => system.id)).toEqual(['installation-nova-pos-production']); expect(data.incidents).toEqual([]); });
  it('does not expose internal infrastructure or operational action fields', async () => { const data = await createMockClientMonitoringDataSource().getMonitoring(CLIENT_A_CONTEXT); const projection = JSON.stringify(data).toLowerCase(); ['hostname', 'privateip', 'infrastructurenodeid', 'topology', 'credential', 'requestedby', 'actiontype', 'failureSummary'.toLowerCase()].forEach((field) => expect(projection).not.toContain(field)); });
});

describe('client monitoring mode', () => {
  it('renders only client navigation and read-only status', async () => { renderClientMonitoring(); expect(await screen.findByRole('heading', { name: 'Nova Salon systems' })).toBeInTheDocument(); expect(screen.getByRole('navigation', { name: 'Client monitoring navigation' })).toBeInTheDocument(); expect(screen.getByText('Read-only')).toBeInTheDocument(); ['Request Operational Action', 'Restart', 'Redeploy', 'Acknowledge', 'Resolve'].forEach((label) => expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()); });
  it('opens a client-safe system detail dialog without internal operational controls', async () => { renderClientMonitoring('/client-monitoring/systems'); expect(await screen.findByRole('heading', { name: 'Systems' })).toBeInTheDocument(); const actionTrigger = document.querySelector<HTMLElement>('[data-ds-component="data-table"] tbody [data-ds-component="dropdown-trigger"]'); expect(actionTrigger).not.toBeNull(); fireEvent.click(actionTrigger!); fireEvent.click(screen.getByRole('button', { name: 'View details' })); expect(await screen.findByRole('dialog', { name: 'Nova POS Production' })).toBeInTheDocument(); expect(screen.getByText('Client-visible system details')).toBeInTheDocument(); expect(screen.queryByText('Infrastructure')).not.toBeInTheDocument(); expect(screen.queryByText('Operational Actions')).not.toBeInTheDocument(); });
});

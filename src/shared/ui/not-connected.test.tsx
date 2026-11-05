import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resolveClientContactDataSource } from '../../features/clients/data/resolve-client-contact-data-source';
import { resolveClientMonitoringDataSource } from '../../features/clients/monitoring/resolve-client-monitoring-data-source';
import { resolveDashboardDataSource } from '../../features/dashboard/data/resolve-dashboard-data-source';
import { resolveInfrastructureDataSource } from '../../features/infrastructure/data/resolve-infrastructure-data-source';
import { resolveOperationsDataSource } from '../../features/operations/data/resolve-operations-data-source';
import { resolveRuntimeDataSource } from '../../features/runtime/data/resolve-runtime-data-source';
import { NotConnectedError } from '../data/data-availability';
import { ConnectedOnly } from './not-connected';

vi.mock('../config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

describe('core mode without a CORE source', () => {
  it('shows the not-connected state and its sentence, and never renders the mock view', () => {
    const MockView = vi.fn(() => <p>Mock records</p>);
    render(
      <ConnectedOnly pageTitle="Incidents" description="Open and resolved incidents will appear here.">
        <MockView />
      </ConnectedOnly>,
    );

    expect(screen.getByRole('heading', { name: 'Incidents' })).toBeInTheDocument();
    expect(screen.getByText('Not connected yet')).toBeInTheDocument();
    expect(screen.getByText('Open and resolved incidents will appear here.')).toBeInTheDocument();
    expect(MockView).not.toHaveBeenCalled();
  });

  it.each([
    ['client contacts', () => resolveClientContactDataSource().getClientContacts('client')],
    ['client monitoring', () => resolveClientMonitoringDataSource().getClientMonitoring('client')],
    ['dashboard', () => resolveDashboardDataSource().getOverview()],
    ['infrastructure', () => resolveInfrastructureDataSource().getInfrastructureNodes({} as never)],
    ['operations', () => resolveOperationsDataSource().getIncidents()],
    ['runtime health', () => resolveRuntimeDataSource().getRuntimeData()],
  ] as Array<[string, () => Promise<unknown>]>)('%s rejects instead of returning mock records', async (_area, call) => {
    await expect(call()).rejects.toBeInstanceOf(NotConnectedError);
  });
});

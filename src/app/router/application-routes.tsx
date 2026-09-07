import type { RouteObject } from 'react-router';
import { ApplicationShell } from '../shell/application-shell';
import { DashboardPage } from '../../features/dashboard/pages/dashboard-page';
import { ClientDetailPage } from '../../features/clients/pages/client-detail-page';
import { ClientListPage } from '../../features/clients/pages/client-list-page';
import { CreateClientPage } from '../../features/clients/pages/create-client-page';
import { EditClientPage } from '../../features/clients/pages/edit-client-page';
import { ProductListPage } from '../../features/products/pages/product-list-page';
import { InstallationListPage } from '../../features/installations/pages/installation-list-page';
import { InfrastructureListPage } from '../../features/infrastructure/pages/infrastructure-list-page';
import { IncidentsPage } from '../../features/operations/pages/incidents-page';
import { DeploymentsPage } from '../../features/operations/pages/deployments-page';
import { PlatformHealthPage } from '../../features/runtime/pages/platform-health-page';
import { ClientMonitoringPage } from '../../features/client-monitoring/pages/client-monitoring-page';
import { ClientMonitoringOverviewPage } from '../../features/client-monitoring/pages/client-monitoring-overview-page';
import { ClientMonitoringSystemsPage } from '../../features/client-monitoring/pages/client-monitoring-systems-page';
import { ClientMonitoringIncidentsPage } from '../../features/client-monitoring/pages/client-monitoring-incidents-page';
import { NotFoundPage } from './not-found-page';
import { PlaceholderPage } from './placeholder-page';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
  { path: '/client-monitoring', element: <ClientMonitoringPage />, children: [{ index: true, element: <ClientMonitoringOverviewPage /> }, { path: 'systems', element: <ClientMonitoringSystemsPage /> }, { path: 'incidents', element: <ClientMonitoringIncidentsPage /> }] },
  {
    path: '/',
    element: <ApplicationShell />,
    errorElement: <RouteErrorState />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/new', element: <CreateClientPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'clients/:clientId/edit', element: <EditClientPage /> },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      { path: 'installations', element: <InstallationListPage /> },
      { path: 'infrastructure', element: <InfrastructureListPage /> },
      { path: 'deployments', element: <DeploymentsPage /> },
      { path: 'incidents', element: <IncidentsPage /> },
      {
        path: 'users',
        element: <PlaceholderPage title="Users" description="Internal Control Center user access will be managed here." />,
      },
      {
        path: 'invitations',
        element: <PlaceholderPage title="Invitations" description="Pending operator invitations will be managed here." />,
      },
      {
        path: 'roles',
        element: <PlaceholderPage title="Roles" description="Control Center role definitions will be managed here." />,
      },
      {
        path: 'audit',
        element: <PlaceholderPage title="Audit" description="Auditable operator activity will be reviewed here." />,
      },
      { path: 'platform-health', element: <PlatformHealthPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

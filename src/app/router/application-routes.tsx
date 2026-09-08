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
import { NotFoundPage } from './not-found-page';
import { AuditPage, InvitationsPage, RolesPage, UsersPage } from '../../features/access/pages/access-pages';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
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
      { path: 'users', element: <UsersPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'platform-health', element: <PlatformHealthPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

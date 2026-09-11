import type { RouteObject } from 'react-router';
import { ApplicationShell } from '../shell/application-shell';
import { DashboardPage } from '../../features/dashboard/pages/dashboard-page';
import { ClientDetailPage } from '../../features/clients/pages/client-detail-page';
import { ClientListPage } from '../../features/clients/pages/client-list-page';
import { CreateClientPage } from '../../features/clients/pages/create-client-page';
import { EditClientPage } from '../../features/clients/pages/edit-client-page';
import { ClientOnboardingPage } from '../../features/client-onboarding/pages/client-onboarding-page';
import { ProductListPage } from '../../features/products/pages/product-list-page';
import { CapabilityListPage } from '../../features/capabilities/pages/capability-list-page';
import { InstallationListPage } from '../../features/installations/pages/installation-list-page';
import { InfrastructureListPage } from '../../features/infrastructure/pages/infrastructure-list-page';
import { IncidentsPage } from '../../features/operations/pages/incidents-page';
import { DeploymentsPage } from '../../features/operations/pages/deployments-page';
import { PlatformHealthPage } from '../../features/runtime/pages/platform-health-page';
import { LoginPage } from '../../features/auth/pages/login-page';
import { RequireAuthentication } from '../../features/auth/components/require-authentication';
import { NotFoundPage } from './not-found-page';
import {
  AuditPage,
  InvitationsPage,
  RolesPage,
  UsersPage,
} from '../../features/access/pages/access-pages';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuthentication>
        <ApplicationShell />
      </RequireAuthentication>
    ),
    errorElement: <RouteErrorState />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/new', element: <CreateClientPage /> },
      { path: 'clients/onboard', element: <ClientOnboardingPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'clients/:clientId/edit', element: <EditClientPage /> },
      { path: 'products', element: <ProductListPage /> },
      { path: 'capabilities', element: <CapabilityListPage /> },
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

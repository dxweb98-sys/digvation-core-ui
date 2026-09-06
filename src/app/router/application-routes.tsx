import type { RouteObject } from 'react-router';
import { ApplicationShell } from '../shell/application-shell';
import { DashboardPage } from '../../features/dashboard/pages/dashboard-page';
import { NotFoundPage } from './not-found-page';
import { PlaceholderPage } from './placeholder-page';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
  {
    path: '/',
    element: <ApplicationShell />,
    errorElement: <RouteErrorState />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'clients',
        element: <PlaceholderPage title="Clients" description="Customer organizations and their lifecycle will be managed here." />,
      },
      {
        path: 'products',
        element: <PlaceholderPage title="Products" description="Digvation product definitions and capabilities will be managed here." />,
      },
      {
        path: 'installations',
        element: <PlaceholderPage title="Installations" description="Client runtime installations and environments will be visible here." />,
      },
      {
        path: 'infrastructure',
        element: <PlaceholderPage title="Infrastructure" description="Digvation-managed infrastructure inventory will be visible here." />,
      },
      {
        path: 'deployments',
        element: <PlaceholderPage title="Deployments" description="Release and deployment history will be visible here." />,
      },
      {
        path: 'incidents',
        element: <PlaceholderPage title="Incidents" description="Operational incident coordination will be managed here." />,
      },
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
      {
        path: 'platform-health',
        element: <PlaceholderPage title="Platform Health" description="Digvation platform-level operational health will be visible here." />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

import type { RouteObject } from 'react-router';
import { AuditPage } from '../../features/access/pages/audit-page';
import { InvitationsPage } from '../../features/access/pages/invitations-page';
import { RolesPage } from '../../features/access/pages/roles-page';
import { UsersPage } from '../../features/access/pages/users-page';
import { BrandPage } from '../../features/clients/pages/brand-page';
import { BusinessPage } from '../../features/clients/pages/business-page';
import { ClientDetailPage } from '../../features/clients/pages/client-detail-page';
import { ClientListPage } from '../../features/clients/pages/client-list-page';
import { RequireAuthentication } from '../../features/auth/components/require-authentication';
import { AcceptInvitationPage } from '../../features/auth/pages/accept-invitation-page';
import { LoginPage } from '../../features/auth/pages/login-page';
import { PasswordResetCodePage } from '../../features/auth/pages/password-reset-code-page';
import { PasswordResetPage } from '../../features/auth/pages/password-reset-page';
import { ApplicationShell } from '../shell/application-shell';
import { HomePage } from './home-page';
import { NotFoundPage } from './not-found-page';
import { RouteErrorState } from './route-error-state';

/**
 * Areas in PARKED_AREAS (../parked-areas.ts) have no route until their backend
 * unit returns; their paths fall through to the not-found page.
 */
export const applicationRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/password-reset', element: <PasswordResetPage /> },
  { path: '/password-reset/code', element: <PasswordResetCodePage /> },
  { path: '/invitations/accept', element: <AcceptInvitationPage /> },
  {
    path: '/',
    element: (
      <RequireAuthentication>
        <ApplicationShell />
      </RequireAuthentication>
    ),
    errorElement: <RouteErrorState />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'clients/:clientId/businesses/:businessId', element: <BusinessPage /> },
      { path: 'clients/:clientId/brands/:brandId', element: <BrandPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

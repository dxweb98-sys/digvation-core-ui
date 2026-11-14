import type { RouteObject } from 'react-router';
import { AuditPage } from '../../features/access/pages/audit-page';
import { InvitationsPage } from '../../features/access/pages/invitations-page';
import { ProfilePage } from '../../features/access/pages/profile-page';
import { RolesPage } from '../../features/access/pages/roles-page';
import { UsersPage } from '../../features/access/pages/users-page';
import { CatalogItemsPage } from '../../features/catalog/pages/catalog-items-page';
import { ProductDetailPage } from '../../features/catalog/pages/product-detail-page';
import { ProductListPage } from '../../features/catalog/pages/product-list-page';
import { ClientDetailPage } from '../../features/clients/pages/client-detail-page';
import { ClientListPage } from '../../features/clients/pages/client-list-page';
import { RequireAuthentication } from '../../features/auth/components/require-authentication';
import { AcceptInvitationPage } from '../../features/auth/pages/accept-invitation-page';
import { LoginPage } from '../../features/auth/pages/login-page';
import { PasswordResetPage } from '../../features/auth/pages/password-reset-page';
import { ApplicationShell } from '../shell/application-shell';
import { HomePage } from './home-page';
import { NotFoundPage } from './not-found-page';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/password-reset', element: <PasswordResetPage /> },
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
      { path: 'profile', element: <ProfilePage /> },
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'products', element: <ProductListPage /> },
      { path: 'products/:productId', element: <ProductDetailPage /> },
      { path: 'catalog', element: <CatalogItemsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

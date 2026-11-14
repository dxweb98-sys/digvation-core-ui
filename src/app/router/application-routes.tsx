import type { RouteObject } from 'react-router';
import { RequireAuthentication } from '../../features/auth/components/require-authentication';
import { LoginPage } from '../../features/auth/pages/login-page';
import { ApplicationShell } from '../shell/application-shell';
import { HomePage } from './home-page';
import { NotFoundPage } from './not-found-page';
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
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

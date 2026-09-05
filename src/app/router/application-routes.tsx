import type { RouteObject } from 'react-router';
import { ApplicationShell } from '../shell/application-shell';
import { OverviewPage } from '../../features/overview/pages/overview-page';
import { NotFoundPage } from './not-found-page';
import { RouteErrorState } from './route-error-state';

export const applicationRoutes: RouteObject[] = [
  {
    path: '/',
    element: <ApplicationShell />,
    errorElement: <RouteErrorState />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

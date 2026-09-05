import { createBrowserRouter, RouterProvider } from 'react-router';
import { applicationRoutes } from './application-routes';

const applicationRouter = createBrowserRouter(applicationRoutes);

export function ApplicationRouter() {
  return <RouterProvider router={applicationRouter} />;
}

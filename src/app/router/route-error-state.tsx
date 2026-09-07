import { DConnectionError } from '@digvation/ui';
import { isRouteErrorResponse, useRouteError } from 'react-router';

export function RouteErrorState() {
  const routeError = useRouteError();
  const detail = isRouteErrorResponse(routeError)
    ? `${routeError.status} ${routeError.statusText}`
    : undefined;

  return (
    <main className="application-error-page">
      <DConnectionError
        title="This view could not load"
        message="The requested Control Center view is unavailable."
        detail={detail}
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}

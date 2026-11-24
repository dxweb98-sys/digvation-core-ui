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
        title="Tampilan ini tidak bisa dimuat"
        message="Tampilan Control Center yang diminta tidak tersedia."
        detail={detail}
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}

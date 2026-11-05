import { AppAction } from '../../shared/ui/app-action';
import { DEmptyState } from '@digvation/ui';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <DEmptyState
        title={<span id="not-found-title">Page not found</span>}
        description="This page does not exist."
        action={
          <AppAction tone="secondary" onClick={() => navigate('/')}>Back to dashboard</AppAction>
        }
      />
    </section>
  );
}

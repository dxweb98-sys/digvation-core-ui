import { DButton, DEmptyState } from '@digvation-labs/ui';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <DEmptyState
        title={<span id="not-found-title">Page not found</span>}
        description="The Control Center route you requested does not exist."
        action={
          <DButton onClick={() => navigate('/')}>Return to overview</DButton>
        }
      />
    </section>
  );
}

import { AppAction } from '../../shared/ui/app-action';
import { DEmptyState } from '@digvation/ui';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <DEmptyState
        title={<span id="not-found-title">Halaman tidak ditemukan</span>}
        description="Halaman ini tidak ada."
        action={
          <AppAction tone="secondary" onClick={() => navigate('/')}>Kembali ke awal</AppAction>
        }
      />
    </section>
  );
}

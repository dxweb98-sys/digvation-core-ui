import { useNavigate, useParams } from 'react-router';
import { ClientDetailDialog } from '../components/client-detail-dialog';

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId = '' } = useParams();
  return <ClientDetailDialog clientId={clientId} open onClose={() => navigate('/clients', { replace: true })} />;
}

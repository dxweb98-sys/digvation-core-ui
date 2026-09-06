import { Navigate, useParams } from 'react-router';

export function EditClientPage() {
  const { clientId = '' } = useParams();
  return <Navigate replace to={`/clients/${clientId}`} />;
}

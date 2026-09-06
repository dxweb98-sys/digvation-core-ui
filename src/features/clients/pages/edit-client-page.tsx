import { DCard, DCardContent, DConnectionError, DLoadingIndicator } from '@digvation-labs/ui';
import { useNavigate, useParams } from 'react-router';
import { ClientForm } from '../components/client-form';
import { useClientDetail } from '../hooks/use-client-detail';
import { useUpdateClient } from '../hooks/use-client-mutations';
import type { ClientFormValues } from '../schemas/client-form-schema';
import '../clients.css';

export function EditClientPage() {
  const navigate = useNavigate();
  const { clientId = '' } = useParams();
  const clientQuery = useClientDetail(clientId);
  const updateClient = useUpdateClient(clientId);

  if (clientQuery.isPending) return <div className="clients-page-state"><DLoadingIndicator label="Loading client" /></div>;
  if (clientQuery.isError) return <div className="clients-page-state"><DConnectionError title="Client unavailable" message="Client information could not be loaded." detail={clientQuery.error.message} onRetry={() => void clientQuery.refetch()} /></div>;
  if (!clientQuery.data) return <div className="clients-page-state">Client not found.</div>;

  const client = clientQuery.data.client;

  async function handleUpdate(values: ClientFormValues) {
    await updateClient.mutateAsync({ displayName: values.displayName, legalName: values.legalName });
    navigate(`/clients/${client.id}`);
  }

  return (
    <div className="client-form-page">
      <div className="client-form-heading">
        <p className="page-eyebrow">Client record</p>
        <h1>Edit {client.displayName}</h1>
        <p>Update client information. The stable client code cannot be changed.</p>
      </div>
      <DCard className="client-form-card" variant="outlined">
        <DCardContent>
          <ClientForm
            mode="edit"
            defaultValues={{ code: client.code, displayName: client.displayName, legalName: client.legalName ?? '' }}
            isSubmitting={updateClient.isPending}
            submitLabel="Save Changes"
            onCancel={() => navigate(`/clients/${client.id}`)}
            onSubmit={handleUpdate}
          />
          {updateClient.isError ? <p className="client-form-error">{updateClient.error.message}</p> : null}
        </DCardContent>
      </DCard>
    </div>
  );
}

import { DCard, DCardContent } from '@digvation-labs/ui';
import { useNavigate } from 'react-router';
import { ClientForm } from '../components/client-form';
import { useCreateClient } from '../hooks/use-client-mutations';
import type { ClientFormValues } from '../schemas/client-form-schema';
import '../clients.css';

export function CreateClientPage() {
  const navigate = useNavigate();
  const createClient = useCreateClient();

  async function handleCreate(values: ClientFormValues) {
    const detail = await createClient.mutateAsync(values);
    navigate(`/clients/${detail.client.id}`);
  }

  return (
    <div className="client-form-page">
      <div className="client-form-heading">
        <p className="page-eyebrow">Customer control plane</p>
        <h1>Add client</h1>
        <p>Create a control-plane client record. The client code becomes immutable once created.</p>
      </div>
      <DCard className="client-form-card" variant="outlined">
        <DCardContent>
          <ClientForm
            mode="create"
            defaultValues={{ code: '', displayName: '', legalName: '' }}
            isSubmitting={createClient.isPending}
            submitLabel="Create Client"
            onCancel={() => navigate('/clients')}
            onSubmit={handleCreate}
          />
          {createClient.isError ? <p className="client-form-error">{createClient.error.message}</p> : null}
        </DCardContent>
      </DCard>
    </div>
  );
}

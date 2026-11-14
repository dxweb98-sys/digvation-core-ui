import { DDataTable, DEmptyState } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AppAction } from '../../../shared/ui/app-action';
import { QueryState, Section } from '../../../shared/ui/page';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import type { ClientDetail } from '../../clients/clients-api';
import { useClientServices } from '../services-queries';
import { ProvisionServiceDialog } from './provision-service-dialog';
import { SERVICE_COLUMNS } from './services-table';

export function ClientServicesTab({ client }: { client: ClientDetail }) {
  const navigate = useNavigate();
  const services = useClientServices(client.id);
  const { can } = usePermissions();
  const [provisioning, setProvisioning] = useState(false);
  const canProvision =
    can(PERMISSIONS.SERVICES_MANAGE) && can(PERMISSIONS.CATALOG_READ) && client.status === 'ACTIVE';

  return (
    <Section
      title="Services"
      actions={
        canProvision ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setProvisioning(true)}>
            Provision service
          </AppAction>
        ) : null
      }
    >
      <QueryState query={services} label="services">
        {(items) => (
          <DDataTable
            columns={SERVICE_COLUMNS}
            data={items}
            rowKey="id"
            onRowClick={(service) => navigate(`/clients/${client.id}/services/${service.id}`)}
            emptyMessage={
              <DEmptyState title="No services" description="Provision a product for one of the client's brands." />
            }
          />
        )}
      </QueryState>
      <ProvisionServiceDialog client={client} open={provisioning} onClose={() => setProvisioning(false)} />
    </Section>
  );
}

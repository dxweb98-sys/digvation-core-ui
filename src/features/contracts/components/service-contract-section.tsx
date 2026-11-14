import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { AppAction } from '../../../shared/ui/app-action';
import { QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { isOpenService, type Service } from '../../services/services-api';
import { CONTRACT_SETTINGS_FIELDS, contractSettingsBody, contractSettingsValues } from '../contract-settings';
import { contractsApi } from '../contracts-api';
import { contractKeys, useServiceContract } from '../contracts-queries';

/** The contract of a service, or the action to create it. */
export function ServiceContractSection({ service }: { service: Service }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const contract = useServiceContract(service.client_id, service.id, can(PERMISSIONS.CONTRACTS_READ));
  const [creating, setCreating] = useState(false);
  const create = useApiMutation(
    (values: Parameters<typeof contractSettingsBody>[0]) =>
      contractsApi.create({ service_id: service.id, ...contractSettingsBody(values) }),
    {
      success: 'Contract created',
      invalidate: [contractKeys.all],
      toastErrors: false,
      onSuccess: (result) => navigate(`/contracts/${result.contract_id}`),
    },
  );
  if (!can(PERMISSIONS.CONTRACTS_READ)) return null;

  return (
    <Section title="Contract">
      <QueryState query={contract} label="contract">
        {(found) =>
          found ? (
            <p className="form-dialog-message">
              <Link to={`/contracts/${found.id}`}>Open the contract</Link> <StatusBadge status={found.status} />
            </p>
          ) : (
            <div className="app-page-actions">
              <p className="form-dialog-message">This service has no contract yet, so nothing is billed.</p>
              {can(PERMISSIONS.CONTRACTS_MANAGE) && isOpenService(service.status) ? (
                <AppAction tone="secondary" size="sm" onClick={() => setCreating(true)}>
                  Create contract
                </AppAction>
              ) : null}
            </div>
          )
        }
      </QueryState>
      <FormDialog
        open={creating}
        title="Create contract"
        description="Add terms with the agreed price on the contract page."
        fields={CONTRACT_SETTINGS_FIELDS}
        initialValues={contractSettingsValues()}
        submitLabel="Create contract"
        onSubmit={(values) => create.mutateAsync(values)}
        onClose={() => setCreating(false)}
      />
    </Section>
  );
}

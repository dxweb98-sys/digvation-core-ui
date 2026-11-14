import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { useBrands, useClientOptions } from '../../clients/clients-queries';
import { billingApi } from '../billing-api';
import { billingKeys } from '../billing-queries';

/** An empty draft for ad-hoc items. Recurring charges are drafted by CORE on its own. */
export function NewDraftDialog({ open, clientId, onClose }: { open: boolean; clientId?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const clients = useClientOptions(open && !clientId);
  const [chosen, setChosen] = useState(clientId ?? '');
  const brands = useBrands(clientId ?? chosen, open);
  const create = useApiMutation(billingApi.createDraft, {
    success: 'Draft invoice opened',
    invalidate: [billingKeys.all],
    toastErrors: false,
    onSuccess: (draft) => navigate(`/invoices/${draft.id}`),
  });

  const fields = useMemo<FieldSpec[]>(
    () => [
      ...(clientId
        ? []
        : [{ name: 'client_id', label: 'Client', kind: 'select' as const, required: true, options: clients.data ?? [] }]),
      {
        name: 'brand_id',
        label: 'Brand billed',
        kind: 'select',
        required: true,
        options: (brands.data ?? [])
          .filter((brand) => brand.status === 'ACTIVE')
          .map((brand) => ({ value: brand.id, label: `${brand.name} (${brand.code})` })),
        hint: 'The invoice goes to the billing contacts of this brand.',
      },
    ],
    [clientId, clients.data, brands.data],
  );

  return (
    <FormDialog
      open={open}
      title="New draft invoice"
      description="Use this for one-off items. Subscription and contract charges are drafted automatically."
      fields={fields}
      submitLabel="Open draft"
      onValuesChange={(values) => {
        if (!clientId) setChosen(read.text(values, 'client_id'));
      }}
      onSubmit={(values) => create.mutateAsync({ brand_id: read.text(values, 'brand_id'), currency: 'IDR' })}
      onClose={onClose}
    />
  );
}

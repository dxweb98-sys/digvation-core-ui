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
    success: 'Draf invoice dibuka',
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
        label: 'Brand ditagih',
        kind: 'select',
        required: true,
        options: (brands.data ?? [])
          .filter((brand) => brand.status === 'ACTIVE')
          .map((brand) => ({ value: brand.id, label: `${brand.name} (${brand.code})` })),
        hint: 'Invoice dikirim ke kontak penagihan brand ini.',
      },
    ],
    [clientId, clients.data, brands.data],
  );

  return (
    <FormDialog
      open={open}
      title="Draf invoice baru"
      description="Gunakan untuk tagihan sekali jalan. Biaya langganan dan contract dibuat sebagai draf otomatis."
      fields={fields}
      submitLabel="Buka draf"
      onValuesChange={(values) => {
        if (!clientId) setChosen(read.text(values, 'client_id'));
      }}
      onSubmit={(values) => create.mutateAsync({ brand_id: read.text(values, 'brand_id'), currency: 'IDR' })}
      onClose={onClose}
    />
  );
}

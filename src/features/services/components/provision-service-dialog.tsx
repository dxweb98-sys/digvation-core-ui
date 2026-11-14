import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { useActiveProductOptions, useFeatures } from '../../catalog/catalog-queries';
import type { ClientDetail } from '../../clients/clients-api';
import { clientKeys } from '../../clients/clients-queries';
import { servicesApi } from '../services-api';
import { serviceKeys } from '../services-queries';

/** Provisions a product for one brand. Features can be changed later while the service is open. */
export function ProvisionServiceDialog({
  client,
  open,
  onClose,
}: {
  client: ClientDetail;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const products = useActiveProductOptions(open);
  const [productId, setProductId] = useState('');
  const features = useFeatures(productId, open);
  const create = useApiMutation(
    (body: Parameters<typeof servicesApi.create>[1]) => servicesApi.create(client.id, body),
    {
      success: 'Service provisioned',
      invalidate: [serviceKeys.all, clientKeys.detail(client.id)],
      toastErrors: false,
      onSuccess: (result) => navigate(`/clients/${client.id}/services/${result.service_id}`),
    },
  );

  const fields = useMemo<FieldSpec[]>(
    () => [
      {
        name: 'brand_id',
        label: 'Brand',
        kind: 'select',
        required: true,
        half: true,
        options: client.brands
          .filter((brand) => brand.status === 'ACTIVE')
          .map((brand) => ({ value: brand.id, label: `${brand.name} (${brand.code})` })),
        hint: 'The brand cannot be changed later.',
      },
      {
        name: 'product_id',
        label: 'Product',
        kind: 'select',
        required: true,
        half: true,
        options: products.data ?? [],
        hint: 'Only active products. It cannot be changed later.',
      },
      {
        name: 'feature_ids',
        label: 'Features',
        kind: 'checklist',
        visible: (values) => Boolean(values.product_id),
        options: (features.data ?? [])
          .filter(
            (feature) =>
              feature.status === 'ACTIVE' && (feature.scope === 'PRODUCT' || feature.owner_client_id === client.id),
          )
          .map((feature) => ({
            value: feature.id,
            label: feature.name,
            description: feature.scope === 'CLIENT' ? `${feature.code} · custom for this client` : feature.code,
          })),
        hint: features.isFetching ? 'Loading features…' : undefined,
      },
    ],
    [client, products.data, features.data, features.isFetching],
  );

  return (
    <FormDialog
      open={open}
      title="Provision service"
      description="The service starts in provisioning. Add-ons and status changes are made on the service page."
      fields={fields}
      submitLabel="Provision service"
      onValuesChange={(values) => setProductId(read.text(values, 'product_id'))}
      onSubmit={(values) =>
        create.mutateAsync({
          brand_id: read.text(values, 'brand_id'),
          product_id: read.text(values, 'product_id'),
          feature_ids: read.list(values, 'feature_ids'),
        })
      }
      onClose={() => {
        setProductId('');
        onClose();
      }}
    />
  );
}

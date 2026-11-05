import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppSelect } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';
import { DConnectionError, DEmptyState, DLoadingIndicator, useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useAssignableProducts } from '../hooks/use-client-products';
import { useAssignClientProduct } from '../hooks/use-client-product-mutations';

export function AssignProductDialog({ clientId, open, onClose }: { clientId: string; open: boolean; onClose: () => void }) {
  const [productId, setProductId] = useState<string | null>(null);
  const assignableProductsQuery = useAssignableProducts(clientId);
  const assignClientProduct = useAssignClientProduct();
  const { showToast } = useToast();

  function closeDialog() {
    if (!assignClientProduct.isPending) {
      setProductId(null);
      onClose();
    }
  }

  async function assignProduct() {
    if (!productId) return;
    try {
      await assignClientProduct.mutateAsync({ clientId, productId });
      showToast({ title: 'Product assigned', description: 'The product starts in provisioning.', variant: 'success' });
      closeDialog();
    } catch (error) {
      showToast({ title: 'Product assignment failed', description: error instanceof Error ? error.message : 'The product could not be assigned.', variant: 'danger' });
    }
  }
  const { field, allowSubmit } = useFieldErrors<'productId'>('assign-product-form', () =>
    productId ? {} : { productId: 'Select a product.' },
  );


  let content = <div className="client-product-dialog-state"><DLoadingIndicator label="Loading available products" /></div>;
  if (assignableProductsQuery.isError) {
    content = <DConnectionError title="Products unavailable" message="Available products could not be loaded." detail={assignableProductsQuery.error.message} onRetry={() => void assignableProductsQuery.refetch()} />;
  } else if (assignableProductsQuery.data) {
    content = assignableProductsQuery.data.length === 0
      ? <DEmptyState title="All products assigned" description="This client already has every available product." />
      : <div id="assign-product-form"><AppSelect {...field('productId')} label="Product" placeholder="Select a product" value={productId} onValueChange={(value) => setProductId(typeof value === 'string' ? value : null)} options={assignableProductsQuery.data.map((product) => ({ value: product.id, label: `${product.name} · ${product.code}` }))} /></div>;
  }

  const hasOptions = Boolean(assignableProductsQuery.data?.length);
  return (
    <AppDialog kind="form"
      open={open}
      onClose={closeDialog}
      title="Assign product"
      description="The product starts in provisioning."
      footer={<div className="client-product-dialog-actions"><AppAction tone="secondary" onClick={closeDialog} disabled={assignClientProduct.isPending}>Cancel</AppAction><AppAction onClick={() => { if (allowSubmit()) void assignProduct(); }} disabled={!hasOptions} loading={assignClientProduct.isPending}>Assign product</AppAction></div>}
    >
      {content}
    </AppDialog>
  );
}

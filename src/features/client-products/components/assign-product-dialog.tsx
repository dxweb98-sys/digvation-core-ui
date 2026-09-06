import { DButton, DConnectionError, DDialog, DEmptyState, DLoadingIndicator, DSelect, useToast } from '@digvation-labs/ui';
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
      showToast({ title: 'Product assigned', description: 'The product relationship begins in provisioning.', variant: 'success' });
      closeDialog();
    } catch (error) {
      showToast({ title: 'Product assignment failed', description: error instanceof Error ? error.message : 'The product could not be assigned.', variant: 'danger' });
    }
  }

  let content = <div className="client-product-dialog-state"><DLoadingIndicator label="Loading available products" /></div>;
  if (assignableProductsQuery.isError) {
    content = <DConnectionError title="Products unavailable" message="Available products could not be loaded." detail={assignableProductsQuery.error.message} onRetry={() => void assignableProductsQuery.refetch()} />;
  } else if (assignableProductsQuery.data) {
    content = assignableProductsQuery.data.length === 0
      ? <DEmptyState title="All products assigned" description="This client already has every available product relationship." />
      : <DSelect label="Product *" placeholder="Select a product" value={productId} onValueChange={(value) => setProductId(typeof value === 'string' ? value : null)} options={assignableProductsQuery.data.map((product) => ({ value: product.id, label: `${product.name} · ${product.code}` }))} />;
  }

  const canAssign = Boolean(productId) && Boolean(assignableProductsQuery.data?.length);
  return (
    <DDialog
      open={open}
      onClose={closeDialog}
      title="Assign product"
      description="The new client product relationship will start in Provisioning."
      footer={<div className="client-product-dialog-actions"><DButton variant="outline" onClick={closeDialog} disabled={assignClientProduct.isPending}>Cancel</DButton><DButton onClick={() => void assignProduct()} disabled={!canAssign} loading={assignClientProduct.isPending}>Assign Product</DButton></div>}
    >
      {content}
    </DDialog>
  );
}

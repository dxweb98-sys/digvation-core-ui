import { AppAction } from '../../../shared/ui/app-action';
import { useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { ProductForm } from './product-form';
import { useCreateProduct, useUpdateProduct } from '../hooks/use-product-mutations';
import type { ProductFormValues } from '../schemas/product-form-schema';
import type { Product } from '../types/product';

const PRODUCT_FORM_ID = 'product-form';

export function ProductFormDialog({ open, mode, product, onClose }: { open: boolean; mode: 'create' | 'edit'; product?: Product; onClose: () => void }) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');
  const { showToast } = useToast();
  const isEditing = mode === 'edit';
  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  function closeDialog() {
    if (!isSubmitting) onClose();
  }

  async function submitProduct(values: ProductFormValues) {
    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ name: values.name, description: values.description });
        showToast({ title: 'Product updated', description: `${values.name} was updated.`, variant: 'success' });
      } else {
        await createProduct.mutateAsync(values);
        showToast({ title: 'Product created', description: `${values.name} was added to the product catalog.`, variant: 'success' });
      }
      onClose();
    } catch (error) {
      showToast({ title: isEditing ? 'Product update failed' : 'Product creation failed', description: error instanceof Error ? error.message : 'The product record could not be saved.', variant: 'danger' });
      throw error;
    }
  }

  return (
    <AppDialog kind="form"
      open={open}
      onClose={closeDialog}
      title={isEditing ? `Edit ${product?.name ?? 'product'}` : 'Add product'}
      footer={<div className="product-dialog-actions"><AppAction tone="secondary" onClick={closeDialog} disabled={isSubmitting}>Cancel</AppAction><AppAction form={PRODUCT_FORM_ID} type="submit" loading={isSubmitting}>{isEditing ? 'Save' : 'Create product'}</AppAction></div>}
    >
      <ProductForm formId={PRODUCT_FORM_ID} mode={mode} defaultValues={isEditing && product ? { code: product.code, name: product.name, description: product.description ?? '' } : { code: '', name: '', description: '' }} onSubmit={submitProduct} />
    </AppDialog>
  );
}

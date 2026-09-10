import { DButton, DDialog, useToast } from '@digvation/ui';
import {
  useCreateProductFeature,
  useUpdateProductFeature,
} from '../hooks/use-product-mutations';
import type { Product, ProductFeature } from '../types/product';
import type { ProductFeatureFormValues } from '../schemas/product-feature-form-schema';
import { ProductFeatureForm } from './product-feature-form';

const PRODUCT_FEATURE_FORM_ID = 'product-feature-form';

export function ProductFeatureFormDialog({
  open,
  mode,
  product,
  feature,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  product: Product;
  feature?: ProductFeature;
  onClose: () => void;
}) {
  const createFeature = useCreateProductFeature();
  const updateFeature = useUpdateProductFeature();
  const { showToast } = useToast();
  const isEditing = mode === 'edit';
  const isSubmitting = createFeature.isPending || updateFeature.isPending;

  function closeDialog() {
    if (!isSubmitting) onClose();
  }

  async function submitFeature(values: ProductFeatureFormValues) {
    try {
      if (isEditing && feature) {
        await updateFeature.mutateAsync({
          productId: product.id,
          featureId: feature.id,
          name: values.name,
          description: values.description,
        });
        showToast({
          title: 'Product feature updated',
          description: `${values.name} was updated for ${product.name}.`,
          variant: 'success',
        });
      } else {
        await createFeature.mutateAsync({
          productId: product.id,
          code: values.code,
          name: values.name,
          description: values.description,
        });
        showToast({
          title: 'Product feature created',
          description: `${values.name} was added to ${product.name}.`,
          variant: 'success',
        });
      }
      onClose();
    } catch (error) {
      showToast({
        title: isEditing
          ? 'Product feature update failed'
          : 'Product feature creation failed',
        description:
          error instanceof Error
            ? error.message
            : 'The product feature could not be saved.',
        variant: 'danger',
      });
    }
  }

  return (
    <DDialog
      open={open}
      onClose={closeDialog}
      title={
        isEditing ? `Edit ${feature?.name ?? 'feature'}` : 'Add product feature'
      }
      description={
        isEditing
          ? `Update the ${product.name} feature definition. The stable feature code cannot be changed.`
          : `Add product-owned behavior to ${product.name}. Reusable cross-product behavior belongs in Capabilities instead.`
      }
      footer={
        <div className="product-dialog-actions">
          <DButton
            variant="outline"
            onClick={closeDialog}
            disabled={isSubmitting}
          >
            Cancel
          </DButton>
          <DButton
            form={PRODUCT_FEATURE_FORM_ID}
            type="submit"
            loading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create Feature'}
          </DButton>
        </div>
      }
    >
      <ProductFeatureForm
        formId={PRODUCT_FEATURE_FORM_ID}
        mode={mode}
        defaultValues={
          isEditing && feature
            ? {
                code: feature.code,
                name: feature.name,
                description: feature.description ?? '',
              }
            : { code: '', name: '', description: '' }
        }
        onSubmit={submitFeature}
      />
    </DDialog>
  );
}

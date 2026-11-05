import { AppAction } from '../../../shared/ui/app-action';
import { useToast } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
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
      throw error;
    }
  }

  return (
    <AppDialog kind="form"
      open={open}
      onClose={closeDialog}
      title={
        isEditing ? `Edit ${feature?.name ?? 'feature'}` : 'Add product feature'
      }
      footer={
        <div className="product-dialog-actions">
          <AppAction
            tone="secondary"
            onClick={closeDialog}
            disabled={isSubmitting}
          >
            Cancel
          </AppAction>
          <AppAction
            form={PRODUCT_FEATURE_FORM_ID}
            type="submit"
            loading={isSubmitting}
          >
            {isEditing ? 'Save' : 'Create feature'}
          </AppAction>
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
    </AppDialog>
  );
}


import { useValidatedForm } from '../../../shared/forms/use-validated-form';
import { AppInput, AppTextarea } from '../../../shared/ui/form-fields';
import { useEffect } from 'react';
import {
  normalizeProductFeatureCode,
  productFeatureFormSchema,
  type ProductFeatureFormValues,
} from '../schemas/product-feature-form-schema';

function normalizeValues(values: ProductFeatureFormValues) {
  return {
      ...values,
      code: normalizeProductFeatureCode(values.code),
      description: values.description?.trim() || undefined,
    };
}

export function ProductFeatureForm({
  formId,
  mode,
  defaultValues,
  onSubmit,
}: {
  formId: string;
  mode: 'create' | 'edit';
  defaultValues: ProductFeatureFormValues;
  onSubmit: (values: ProductFeatureFormValues) => void | Promise<void>;
}) {
  const { form, field, change, onInvalid, applyServerError } = useValidatedForm<ProductFeatureFormValues>({
    formId,
    schema: productFeatureFormSchema,
    defaultValues,
    normalize: normalizeValues,
  });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: ProductFeatureFormValues) {
    const normalizedValues = normalizeValues(values);
    const result = productFeatureFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof ProductFeatureFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    try {
      await onSubmit(result.data);
    } catch (error) {
      applyServerError(error);
    }
  }

  return (
    <form
      className="product-form"
      id={formId}
      onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
      noValidate
    >
      <AppInput
        label="Feature code" placeholder="pos.sales"
        hint={
          mode === 'create'
            ? 'Stable product-scoped identifier, for example pos.sales. Lowercase letters, numbers, dots, underscores, and hyphens only.'
            : 'Cannot be changed.'
        }
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        {...field('code')}
        onChange={(value) =>
          change('code', normalizeProductFeatureCode(value))
        }
      />
      <AppInput
        label="Feature name" placeholder="Sales"
        value={form.watch('name')}
        {...field('name')}
        onChange={(value) =>
          change('name', value)
        }
      />
      <AppTextarea
        label="Description" placeholder="Create and complete sales" optional
        value={form.watch('description') ?? ''}
        {...field('description')}
        onChange={(value) =>
          change('description', value)
        }
      />
    </form>
  );
}

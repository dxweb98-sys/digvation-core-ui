import { DInput, DTextarea } from '@digvation/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  normalizeProductFeatureCode,
  productFeatureFormSchema,
  type ProductFeatureFormValues,
} from '../schemas/product-feature-form-schema';

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
  const form = useForm<ProductFeatureFormValues>({ defaultValues });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: ProductFeatureFormValues) {
    const normalizedValues = {
      ...values,
      code: normalizeProductFeatureCode(values.code),
      description: values.description?.trim() || undefined,
    };
    const result = productFeatureFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof ProductFeatureFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form
      className="product-form"
      id={formId}
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
    >
      <DInput
        label="Feature Code *"
        hint={
          mode === 'create'
            ? 'Stable product-scoped identifier, for example pos.sales. Lowercase letters, numbers, dots, underscores, and hyphens only.'
            : 'Feature code is immutable after creation.'
        }
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        error={form.formState.errors.code?.message}
        onChange={(value) =>
          form.setValue('code', normalizeProductFeatureCode(value), {
            shouldValidate: true,
          })
        }
      />
      <DInput
        label="Feature Name *"
        value={form.watch('name')}
        error={form.formState.errors.name?.message}
        onChange={(value) =>
          form.setValue('name', value, { shouldValidate: true })
        }
      />
      <DTextarea
        label="Description"
        hint="Describe product-owned behavior only. Do not duplicate a reusable Capability here."
        value={form.watch('description') ?? ''}
        error={form.formState.errors.description?.message}
        onChange={(value) =>
          form.setValue('description', value, { shouldValidate: true })
        }
      />
    </form>
  );
}

import { DInput, DTextarea } from '@digvation-labs/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { normalizeProductCode, productFormSchema, type ProductFormValues } from '../schemas/product-form-schema';

export type ProductFormMode = 'create' | 'edit';

export function ProductForm({
  formId,
  mode,
  defaultValues,
  onSubmit,
}: {
  formId: string;
  mode: ProductFormMode;
  defaultValues: ProductFormValues;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
}) {
  const form = useForm<ProductFormValues>({ defaultValues });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: ProductFormValues) {
    const normalizedValues = { ...values, code: normalizeProductCode(values.code), description: values.description?.trim() || undefined };
    const result = productFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof ProductFormValues, { message: issue.message });
      }
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form className="product-form" id={formId} onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <DInput
        label="Product Code *"
        hint={mode === 'create' ? 'Stable machine-readable identifier. Uppercase letters, numbers, and hyphens only.' : 'Product code is immutable after creation.'}
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        error={form.formState.errors.code?.message}
        onChange={(value) => form.setValue('code', normalizeProductCode(value), { shouldValidate: true })}
      />
      <DInput label="Product Name *" value={form.watch('name')} error={form.formState.errors.name?.message} onChange={(value) => form.setValue('name', value, { shouldValidate: true })} />
      <DTextarea label="Description" hint="Optional concise description of the product scope." value={form.watch('description') ?? ''} error={form.formState.errors.description?.message} onChange={(value) => form.setValue('description', value, { shouldValidate: true })} />
    </form>
  );
}

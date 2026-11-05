
import { useValidatedForm } from '../../../shared/forms/use-validated-form';
import { AppInput, AppTextarea } from '../../../shared/ui/form-fields';
import { useEffect } from 'react';
import { normalizeProductCode, productFormSchema, type ProductFormValues } from '../schemas/product-form-schema';

export type ProductFormMode = 'create' | 'edit';

function normalizeValues(values: ProductFormValues) {
  return { ...values, code: normalizeProductCode(values.code), description: values.description?.trim() || undefined };
}

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
  const { form, field, change, onInvalid, applyServerError } = useValidatedForm<ProductFormValues>({
    formId,
    schema: productFormSchema,
    defaultValues,
    normalize: normalizeValues,
  });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: ProductFormValues) {
    const normalizedValues = normalizeValues(values);
    const result = productFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof ProductFormValues, { message: issue.message });
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
    <form className="product-form" id={formId} onSubmit={form.handleSubmit(handleSubmit, onInvalid)} noValidate>
      <AppInput
        label="Product code" placeholder="POS"
        hint={mode === 'create' ? 'Uppercase letters, numbers and hyphens. Cannot be changed later.' : 'Cannot be changed.'}
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        {...field('code')}
        onChange={(value) => change('code', normalizeProductCode(value))}
      />
      <AppInput label="Product name" placeholder="Digvation POS" value={form.watch('name')} {...field('name')} onChange={(value) => change('name', value)} />
      <AppTextarea label="Description" placeholder="Point of sale for salons and retail" optional value={form.watch('description') ?? ''} {...field('description')} onChange={(value) => change('description', value)} />
    </form>
  );
}

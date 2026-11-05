
import { useValidatedForm } from '../../../shared/forms/use-validated-form';
import { AppInput, AppTextarea } from '../../../shared/ui/form-fields';
import { useEffect } from 'react';
import {
  capabilityFormSchema,
  normalizeCapabilityCode,
  type CapabilityFormValues,
} from '../schemas/capability-form-schema';

export type CapabilityFormMode = 'create' | 'edit';

function normalizeValues(values: CapabilityFormValues) {
  return {
      ...values,
      code: normalizeCapabilityCode(values.code),
      description: values.description?.trim() || undefined,
    };
}

export function CapabilityForm({
  formId,
  mode,
  defaultValues,
  onSubmit,
}: {
  formId: string;
  mode: CapabilityFormMode;
  defaultValues: CapabilityFormValues;
  onSubmit: (values: CapabilityFormValues) => void | Promise<void>;
}) {
  const { form, field, change, onInvalid, applyServerError } = useValidatedForm<CapabilityFormValues>({
    formId,
    schema: capabilityFormSchema,
    defaultValues,
    normalize: normalizeValues,
  });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: CapabilityFormValues) {
    const normalizedValues = normalizeValues(values);
    const result = capabilityFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof CapabilityFormValues, {
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
      className="capability-form"
      id={formId}
      onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
      noValidate
    >
      <AppInput
        label="Capability code" placeholder="MEMBERSHIP"
        hint={
          mode === 'create'
            ? 'Uppercase letters, numbers, underscores and hyphens. Cannot be changed later.'
            : 'Cannot be changed.'
        }
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        {...field('code')}
        onChange={(value) =>
          change('code', normalizeCapabilityCode(value))
        }
      />
      <AppInput
        label="Capability name" placeholder="Membership"
        value={form.watch('name')}
        {...field('name')}
        onChange={(value) =>
          change('name', value)
        }
      />
      <AppTextarea
        label="Description" placeholder="Member tiers and benefits" optional
        value={form.watch('description') ?? ''}
        {...field('description')}
        onChange={(value) =>
          change('description', value)
        }
      />
    </form>
  );
}

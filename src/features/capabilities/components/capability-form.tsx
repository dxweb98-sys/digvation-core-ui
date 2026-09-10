import { DInput, DTextarea } from '@digvation/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  capabilityFormSchema,
  normalizeCapabilityCode,
  type CapabilityFormValues,
} from '../schemas/capability-form-schema';

export type CapabilityFormMode = 'create' | 'edit';

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
  const form = useForm<CapabilityFormValues>({ defaultValues });
  const { code, name, description } = defaultValues;

  useEffect(() => {
    form.reset({ code, name, description });
  }, [code, description, form, name]);

  async function handleSubmit(values: CapabilityFormValues) {
    const normalizedValues = {
      ...values,
      code: normalizeCapabilityCode(values.code),
      description: values.description?.trim() || undefined,
    };
    const result = capabilityFormSchema.safeParse(normalizedValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof CapabilityFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form
      className="capability-form"
      id={formId}
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
    >
      <DInput
        label="Capability Code *"
        hint={
          mode === 'create'
            ? 'Stable reusable capability identifier. Uppercase letters, numbers, underscores, and hyphens only.'
            : 'Capability code is immutable after creation.'
        }
        value={form.watch('code')}
        readOnly={mode === 'edit'}
        disabled={mode === 'edit'}
        error={form.formState.errors.code?.message}
        onChange={(value) =>
          form.setValue('code', normalizeCapabilityCode(value), {
            shouldValidate: true,
          })
        }
      />
      <DInput
        label="Capability Name *"
        value={form.watch('name')}
        error={form.formState.errors.name?.message}
        onChange={(value) =>
          form.setValue('name', value, { shouldValidate: true })
        }
      />
      <DTextarea
        label="Description"
        hint="Describe the reusable business capability boundary, not a client-specific entitlement."
        value={form.watch('description') ?? ''}
        error={form.formState.errors.description?.message}
        onChange={(value) =>
          form.setValue('description', value, { shouldValidate: true })
        }
      />
    </form>
  );
}

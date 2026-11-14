import {
  useForm,
  type DefaultValues,
  type FieldErrors,
  type FieldValues,
  type Path,
  type Resolver,
} from 'react-hook-form';
import type { ZodType } from 'zod';
import { fieldErrors } from '../api/error-messages';
import { focusFirstInvalid } from '../ui/form-fields';

/**
 * Form state validated by its existing zod schema, on blur and on submit. A failed
 * submit focuses the first invalid field. The rules stay in each schema.
 */
export function useValidatedForm<T extends FieldValues>({
  formId,
  schema,
  defaultValues,
  normalize = (values) => values,
}: {
  formId: string;
  schema: ZodType<unknown>;
  defaultValues: DefaultValues<T>;
  normalize?: (values: T) => unknown;
}) {
  const resolver: Resolver<T> = async (values) => {
    const result = schema.safeParse(normalize(values));
    if (result.success) return { values: result.data as T, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const name = String(issue.path[0]);
      errors[name] ??= { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as FieldErrors<T> };
  };

  const form = useForm<T>({
    defaultValues,
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldFocusError: false,
  });

  /** Blur validation and the error message for one field. */
  const field = (name: Path<T>) => ({
    onBlur: () => void form.trigger(name),
    error: form.formState.errors[name]?.message as string | undefined,
  });

  /** Writes a value and clears a showing error as soon as it is corrected. */
  const change = (name: Path<T>, value: unknown) =>
    form.setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: Boolean(form.formState.errors[name]),
    });

  const onInvalid = () => focusFirstInvalid(formId);

  /**
   * Puts a server validation message on its field when the API names one. Anything
   * else stays with the toast the form's dialog already shows.
   */
  const applyServerError = (error: unknown) => {
    const known = Object.keys(form.getValues());
    let applied = false;
    for (const [name, message] of Object.entries(fieldErrors(error))) {
      const camel = name.replace(/_(\w)/g, (_, letter: string) => letter.toUpperCase());
      const target = known.includes(name) ? name : known.includes(camel) ? camel : undefined;
      if (target) {
        form.setError(target as Path<T>, { message });
        applied = true;
      }
    }
    if (applied) onInvalid();
    return applied;
  };

  return { form, field, change, onInvalid, applyServerError };
}

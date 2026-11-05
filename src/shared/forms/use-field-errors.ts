import { useState } from 'react';
import { focusFirstInvalid } from '../ui/form-fields';

/**
 * For forms held in plain state. `validate` restates the form's existing rule as
 * messages; a field shows its message after blur or after a submit attempt.
 */
export function useFieldErrors<K extends string>(
  formId: string,
  validate: () => Partial<Record<K, string>>,
) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const errors = validate();

  const field = (name: K) => ({
    onBlur: () => setTouched((current) => new Set(current).add(name)),
    error: attempted || touched.has(name) ? errors[name] : undefined,
  });

  /** True when the form may submit; otherwise shows every error and focuses the first. */
  const allowSubmit = () => {
    if (Object.keys(errors).length === 0) return true;
    setAttempted(true);
    focusFirstInvalid(formId);
    return false;
  };

  const reset = () => {
    setTouched(new Set());
    setAttempted(false);
  };

  return { field, allowSubmit, reset };
}

import { useToast } from '@digvation/ui';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { errorReference, friendlyErrorMessage } from './error-messages';

/**
 * A CORE write: on success it refreshes the given queries and announces the
 * result; on failure it shows the operator-facing message unless the caller
 * (a form showing the error itself) asks it not to.
 */
export function useApiMutation<TInput, TResult = unknown>(
  mutationFn: (input: TInput) => Promise<TResult>,
  options: {
    success?: string | ((result: TResult, input: TInput) => string);
    invalidate?: readonly QueryKey[];
    toastErrors?: boolean;
    onSuccess?: (result: TResult, input: TInput) => void;
  } = {},
) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async (result, input) => {
      await Promise.all(
        (options.invalidate ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      const message =
        typeof options.success === 'function' ? options.success(result, input) : options.success;
      if (message) showToast({ title: message, variant: 'success' });
      options.onSuccess?.(result, input);
    },
    onError: (error) => {
      if (options.toastErrors === false) return;
      showToast({
        title: friendlyErrorMessage(error),
        description: errorReference(error),
        variant: 'danger',
      });
    },
  });
}

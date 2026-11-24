import {
  DCurrencyInput,
  DInput,
  DSelect,
  DTextarea,
  DDatePicker,
  type CurrencyInputProps,
  type DatePickerProps,
  type InputProps,
  type SelectProps,
  type TextareaProps,
} from "@digvation/ui";
import { forwardRef, useId, type ReactNode } from "react";
import "./form-fields.css";

function OptionalTag() {
  return <span className="app-field-optional">Opsional</span>;
}

/**
 * Field order is label, input, helper, then error, which replaces the helper while
 * invalid. Required is the default, so only optional fields are tagged. The DS error
 * slot has no id, so the message carries one for aria-describedby.
 */
function useFieldParts({
  label,
  error,
  optional,
  described,
}: {
  label?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  described?: string;
}) {
  const errorId = useId();
  return {
    label: optional ? (
      <>
        {label} <OptionalTag />
      </>
    ) : (
      label
    ),
    error: error ? <span id={errorId}>{error}</span> : undefined,
    "aria-describedby": error ? errorId : described,
  };
}

interface FieldExtras {
  optional?: boolean;
}

type FieldDescribedProps = {
  "aria-describedby"?: string;
};

function getDescribedBy<T extends object>(props: T): string | undefined {
  return (props as T & FieldDescribedProps)["aria-describedby"];
}

export const AppInput = forwardRef<HTMLInputElement, InputProps & FieldExtras>(
  function AppInput({ optional, label, error, ...props }, ref) {
    const parts = useFieldParts({
      label,
      error,
      optional,
      described: getDescribedBy(props),
    });
    return <DInput {...props} {...parts} ref={ref} />;
  },
);

export const AppTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps & FieldExtras
>(function AppTextarea({ optional, label, error, ...props }, ref) {
  const parts = useFieldParts({
    label,
    error,
    optional,
    described: getDescribedBy(props),
  });
  return <DTextarea {...props} {...parts} ref={ref} />;
});

export function AppSelect({
  optional,
  label,
  error,
  ...props
}: SelectProps & FieldExtras) {
  const parts = useFieldParts({
    label,
    error,
    optional,
    described: getDescribedBy(props),
  });
  return <DSelect {...props} {...parts} />;
}

export function AppCurrencyInput({
  optional,
  label,
  error,
  ...props
}: CurrencyInputProps & FieldExtras) {
  const parts = useFieldParts({
    label,
    error,
    optional,
    described: getDescribedBy(props),
  });
  return <DCurrencyInput {...props} {...parts} />;
}

export function AppDateInput({
  optional,
  label,
  error,
  ...props
}: DatePickerProps & FieldExtras) {
  const parts = useFieldParts({
    label,
    error,
    optional,
    described: getDescribedBy(props),
  });

  return <DDatePicker {...props} {...parts} />;
}

/** Moves focus to the first invalid field after a failed submit. */
export function focusFirstInvalid(formId: string) {
  window.requestAnimationFrame(() => {
    document
      .getElementById(formId)
      ?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')
      ?.focus();
  });
}

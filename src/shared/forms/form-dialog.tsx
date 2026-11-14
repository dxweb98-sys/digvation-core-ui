import { DAlert, DCheckbox, DToggle } from '@digvation/ui';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { errorReference, fieldErrors, friendlyErrorMessage } from '../api/error-messages';
import { AppAction, type ActionTone } from '../ui/app-action';
import { AppDialog, DialogActions, type AppDialogKind } from '../ui/app-dialog';
import {
  AppCurrencyInput,
  AppDateInput,
  AppInput,
  AppSelect,
  AppTextarea,
  focusFirstInvalid,
} from '../ui/form-fields';
import {
  initialFormValues,
  isFieldVisible,
  validateForm,
  type FieldSpec,
  type FieldValue,
  type FormValues,
} from './form-spec';
import './form-dialog.css';

function FieldControl({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: FieldSpec;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
  onBlur: () => void;
}) {
  const kind = field.kind ?? 'text';
  const common = {
    label: field.label,
    error,
    hint: field.hint,
    disabled: field.disabled,
    optional: !field.required && kind !== 'toggle',
  };
  const text = typeof value === 'string' ? value : '';
  const groupId = useId();

  switch (kind) {
    case 'textarea':
      return (
        <AppTextarea
          {...common}
          name={field.name}
          placeholder={field.placeholder}
          value={text}
          maxLength={field.maxLength}
          rows={3}
          onBlur={onBlur}
          onChange={(next) => onChange(next)}
        />
      );
    case 'select':
      return (
        <AppSelect
          {...common}
          name={field.name}
          placeholder={field.placeholder ?? 'Select an option'}
          value={text || null}
          options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
          clearable={!field.required}
          onBlur={onBlur}
          onValueChange={(next) => onChange(next === null ? '' : String(next))}
        />
      );
    case 'date':
      return (
        <AppDateInput
          {...common}
          placeholder={field.placeholder ?? 'YYYY-MM-DD'}
          value={text}
          clearable={!field.required}
          onChange={(next) => {
            onChange(next);
            onBlur();
          }}
          onClear={() => onChange('')}
        />
      );
    case 'rupiah':
      return (
        <AppCurrencyInput
          {...common}
          name={field.name}
          placeholder={field.placeholder ?? '0'}
          value={text}
          currencySymbol="Rp"
          groupSeparator="."
          decimalSeparator=","
          scale={0}
          onBlur={onBlur}
          onValueChange={(next) => onChange(next)}
        />
      );
    case 'toggle':
      return (
        <div className="form-dialog-toggle">
          <DToggle
            label={field.label}
            checked={value === true}
            disabled={field.disabled}
            onChange={(checked) => onChange(checked)}
          />
          {field.hint ? <p className="form-dialog-hint">{field.hint}</p> : null}
        </div>
      );
    case 'checklist': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className="form-dialog-checklist" aria-describedby={error ? `${groupId}-error` : undefined}>
          <legend>
            {field.label}
            {!field.required ? <span className="app-field-optional">Optional</span> : null}
          </legend>
          {field.hint ? <p className="form-dialog-hint">{field.hint}</p> : null}
          {(field.options ?? []).length === 0 ? (
            <p className="form-dialog-hint">Nothing to choose from.</p>
          ) : (
            (field.options ?? []).map((option) => (
              <label className="form-dialog-check" key={option.value}>
                <DCheckbox
                  checked={selected.includes(option.value)}
                  disabled={field.disabled}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => {
                    onChange(
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((item) => item !== option.value),
                    );
                    onBlur();
                  }}
                />
                <span>
                  {option.label}
                  {option.description ? <small>{option.description}</small> : null}
                </span>
              </label>
            ))
          )}
          {error ? (
            <p className="form-dialog-error" id={`${groupId}-error`}>
              {error}
            </p>
          ) : null}
        </fieldset>
      );
    }
    case 'file':
      return (
        <div className="form-dialog-file">
          <label htmlFor={`${groupId}-file`}>{field.label}</label>
          <input
            id={`${groupId}-file`}
            type="file"
            accept={field.accept}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              onChange(event.target.files?.[0] ?? null);
              onBlur();
            }}
          />
          {field.hint ? <p className="form-dialog-hint">{field.hint}</p> : null}
          {error ? <p className="form-dialog-error">{error}</p> : null}
        </div>
      );
    default:
      return (
        <AppInput
          {...common}
          name={field.name}
          type={kind === 'integer' ? 'text' : kind}
          inputMode={kind === 'integer' ? 'numeric' : undefined}
          placeholder={field.placeholder}
          value={text}
          maxLength={field.maxLength}
          autoComplete={kind === 'password' ? 'new-password' : undefined}
          onBlur={onBlur}
          onChange={(next) => onChange(next)}
        />
      );
  }
}

/**
 * A dialog that collects a few fields and sends one CORE request. Field names
 * are CORE request fields, so CORE's validation details land on them; any
 * other refusal shows above the actions in the operator's language.
 */
export function FormDialog({
  open,
  title,
  description,
  fields,
  initialValues,
  submitLabel,
  tone = 'primary',
  kind = 'form',
  children,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  fields: readonly FieldSpec[];
  initialValues?: Partial<FormValues>;
  submitLabel: string;
  tone?: Extract<ActionTone, 'primary' | 'danger'>;
  kind?: AppDialogKind;
  children?: ReactNode;
  onSubmit: (values: FormValues) => Promise<unknown>;
  onClose: () => void;
}) {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(() => initialFormValues(fields, initialValues));
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ message: string; reference?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setValues(initialFormValues(fields, initialValues));
      setTouched(new Set());
      setAttempted(false);
      setServerErrors({});
      setFormError(null);
    }
    wasOpen.current = open;
  }, [open, fields, initialValues]);

  const errors = useMemo(() => validateForm(fields, values), [fields, values]);

  function setValue(name: string, value: FieldValue) {
    setValues((current) => ({ ...current, [name]: value }));
    setServerErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (Object.keys(errors).length > 0) {
      setAttempted(true);
      focusFirstInvalid(formId);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      const visibleNames = new Set(
        fields.filter((field) => isFieldVisible(field, values)).map((field) => field.name),
      );
      const byField = Object.fromEntries(
        Object.entries(fieldErrors(error)).filter(([name]) => visibleNames.has(name)),
      );
      setServerErrors(byField);
      setFormError({ message: friendlyErrorMessage(error), reference: errorReference(error) });
      if (Object.keys(byField).length > 0) focusFirstInvalid(formId);
    } finally {
      setSubmitting(false);
    }
  }

  const visibleFields = fields.filter((field) => isFieldVisible(field, values));

  return (
    <AppDialog
      kind={kind}
      open={open}
      title={title}
      description={description}
      onClose={() => (submitting ? undefined : onClose())}
      footer={
        <DialogActions
          secondary={
            <AppAction tone="secondary" disabled={submitting} onClick={onClose}>
              Cancel
            </AppAction>
          }
          primary={
            <AppAction tone={tone} type="submit" form={formId} loading={submitting}>
              {submitLabel}
            </AppAction>
          }
        />
      }
    >
      <form className="form-dialog" id={formId} noValidate onSubmit={submit}>
        {children}
        {visibleFields.length > 0 ? (
          <div className="form-dialog-grid">
            {visibleFields.map((field) => (
              <div
                className={field.half ? 'form-dialog-cell' : 'form-dialog-cell form-dialog-cell-wide'}
                key={field.name}
              >
                <FieldControl
                  field={field}
                  value={values[field.name] ?? null}
                  error={
                    serverErrors[field.name] ??
                    (attempted || touched.has(field.name) ? errors[field.name] : undefined)
                  }
                  onChange={(value) => setValue(field.name, value)}
                  onBlur={() => setTouched((current) => new Set(current).add(field.name))}
                />
              </div>
            ))}
          </div>
        ) : null}
        {formError ? (
          <DAlert variant="danger" role="alert">
            {formError.message}
            {formError.reference ? <span className="form-dialog-reference">{formError.reference}</span> : null}
          </DAlert>
        ) : null}
      </form>
    </AppDialog>
  );
}

/**
 * Confirms one action, optionally with a reason CORE records. Destructive and
 * irreversible actions always go through it.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  reason,
  extraFields = [],
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Asks for a reason under this field name. */
  reason?: { name?: string; label?: string; required?: boolean };
  extraFields?: readonly FieldSpec[];
  onConfirm: (values: FormValues) => Promise<unknown>;
  onClose: () => void;
}) {
  const fields = useMemo<FieldSpec[]>(
    () => [
      ...extraFields,
      ...(reason
        ? [
            {
              name: reason.name ?? 'reason',
              label: reason.label ?? 'Reason',
              kind: 'textarea' as const,
              required: reason.required ?? true,
              maxLength: 500,
            },
          ]
        : []),
    ],
    [extraFields, reason],
  );
  return (
    <FormDialog
      open={open}
      kind="confirm"
      title={title}
      fields={fields}
      submitLabel={confirmLabel}
      tone={tone}
      onSubmit={onConfirm}
      onClose={onClose}
    >
      <p className="form-dialog-message">{message}</p>
    </FormDialog>
  );
}

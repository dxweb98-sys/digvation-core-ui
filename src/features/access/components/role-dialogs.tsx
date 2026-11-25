import { DAlert, DDialog, DSkeleton } from '@digvation/ui';
import { Info } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput, AppTextarea } from '../../../shared/ui/form-fields';
import { accessApi, type Role } from '../access-api';
import { accessKeys, usePermissionCatalog, useRolePermissions } from '../access-queries';
import { slugFromName } from '../role-rules';
import { useRolesCopy } from '../roles-copy';
import type { Actor } from '../user-rules';
import { PermissionGroups } from './permission-groups';
import './role-dialogs.css';

type Alert = [string, string] | null;

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((slug) => b.includes(slug));

/** A server refusal as the dialog alert: the approved copy for known codes, the generic message otherwise. */
function alertFor(cause: unknown, known: Record<string, [string, string]>): [string, string] {
  const code = isApiError(cause) ? cause.code : undefined;
  return (code && known[code]) || [friendlyErrorMessage(cause), ''];
}

function DialogAlert({ alert }: { alert: Alert }) {
  if (!alert) return null;
  return (
    <DAlert variant="danger" title={alert[0]}>
      {alert[1] || null}
    </DAlert>
  );
}

function Footer({ formId, label, saving, disabled, onCancel }: {
  formId: string;
  label: string;
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  const copy = useRolesCopy();
  return (
    <div className="role-dialog-actions">
      <AppAction tone="secondary" onClick={onCancel} disabled={saving}>
        {copy.cancel}
      </AppAction>
      <AppAction type="submit" form={formId} disabled={disabled} loading={saving}>
        {saving ? copy.saving : label}
      </AppAction>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="role-dialog-note">
      <Info size={14} aria-hidden="true" />
      {children}
    </p>
  );
}

/** Keeps the last value while a dialog closes, so its text does not jump. */
function useShown<T>(value: T | null) {
  const [shown, setShown] = useState(value);
  if (value && value !== shown) setShown(value);
  return shown;
}

/** Section C: the permissions of one role. */
export function RolePermissionsDialog({ role, actor, onClose }: { role: Role | null; actor: Actor; onClose: () => void }) {
  const copy = useRolesCopy();
  const shown = useShown(role);
  const catalog = usePermissionCatalog(role !== null);
  const held = useRolePermissions(role?.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [alert, setAlert] = useState<Alert>(null);

  useEffect(() => {
    setAlert(null);
    if (held.data) setSelected(held.data);
  }, [held.data, role]);

  const loading = catalog.isPending || held.isPending;
  const changed = !loading && !sameSet(selected, held.data ?? []);
  const save = useApiMutation(
    (input: { role: Role; slugs: string[] }) =>
      accessApi.setRolePermissions(input.role.id, { permission_slugs: input.slugs }),
    {
      success: (_, input) => copy.permissionsSaved(input.role.name),
      invalidate: [accessKeys.all],
      toastErrors: false,
      onSuccess: onClose,
    },
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shown || !changed || save.isPending) return;
    setAlert(null);
    try {
      await save.mutateAsync({ role: shown, slugs: selected });
    } catch (cause) {
      setAlert(alertFor(cause, copy.permissionErrors));
    }
  }

  const users = shown?.user_count ?? 0;
  return (
    <DDialog
      open={role !== null}
      onClose={onClose}
      size="lg"
      overlayClassName="app-dialog-overlay"
      title={shown ? copy.editorTitle(shown.name) : ''}
      description={shown ? `${shown.slug} · ${users > 0 ? copy.usedBy(users) : copy.notUsed}` : undefined}
      footer={
        <Footer
          formId="role-permissions-form"
          label={copy.savePermissions}
          saving={save.isPending}
          disabled={!changed}
          onCancel={onClose}
        />
      }
    >
      <form id="role-permissions-form" className="role-dialog-form" noValidate onSubmit={submit}>
        <DialogAlert alert={alert} />
        {shown?.is_system ? (
          <DAlert variant="info" role="status" title={copy.systemNotice[0]}>
            {copy.systemNotice[1]}
          </DAlert>
        ) : null}
        {loading ? (
          <div className="role-dialog-skeleton" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <DSkeleton key={index} height={44} />
            ))}
          </div>
        ) : (
          <>
            <p className="role-dialog-count">{copy.chosenCount(selected.length, catalog.data?.length ?? 0)}</p>
            <PermissionGroups catalog={catalog.data ?? []} selected={selected} actor={actor} onChange={setSelected} />
          </>
        )}
        <Note>{copy.appliesNext(users)}</Note>
      </form>
    </DDialog>
  );
}

/** Section D: a new custom role. */
export function CreateRoleDialog({
  open,
  actor,
  canManagePermissions,
  onClose,
}: {
  open: boolean;
  actor: Actor;
  canManagePermissions: boolean;
  onClose: () => void;
}) {
  const copy = useRolesCopy();
  const catalog = usePermissionCatalog(open && canManagePermissions);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSlug('');
    setSlugEdited(false);
    setDescription('');
    setPermissions([]);
    setAttempted(false);
    setSlugTaken(false);
    setAlert(null);
  }, [open]);

  const nameError = attempted && !name.trim() ? copy.nameEmpty : undefined;
  const slugError = slugTaken ? copy.slugTaken : attempted && !slug.trim() ? copy.slugEmpty : undefined;

  const create = useApiMutation(accessApi.createRole, {
    success: (_, input) => copy.created(input.name),
    invalidate: [accessKeys.all],
    toastErrors: false,
    onSuccess: onClose,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    if (!name.trim() || !slug.trim()) {
      setAttempted(true);
      requestAnimationFrame(() => (name.trim() ? slugRef : nameRef).current?.focus());
      return;
    }
    setAlert(null);
    setSlugTaken(false);
    try {
      await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(permissions.length ? { permission_slugs: permissions } : {}),
      });
    } catch (cause) {
      if (isApiError(cause, 'ROLE_SLUG_CONFLICT')) {
        setSlugTaken(true);
        requestAnimationFrame(() => slugRef.current?.focus());
        return;
      }
      setAlert(alertFor(cause, copy.permissionErrors));
    }
  }

  return (
    <DDialog
      open={open}
      onClose={onClose}
      size="lg"
      overlayClassName="app-dialog-overlay"
      title={copy.createTitle}
      description={copy.createDescription}
      footer={
        <Footer formId="create-role-form" label={copy.create} saving={create.isPending} disabled={false} onCancel={onClose} />
      }
    >
      <form id="create-role-form" className="role-dialog-form" noValidate onSubmit={submit}>
        <DialogAlert alert={alert} />
        <div className="role-dialog-pair">
          <AppInput
            ref={nameRef}
            clearable={false}
            label={copy.name}
            placeholder={copy.namePlaceholder}
            maxLength={100}
            value={name}
            error={nameError}
            onChange={(value) => {
              setName(value);
              if (!slugEdited) setSlug(slugFromName(value));
            }}
          />
          <AppInput
            ref={slugRef}
            clearable={false}
            containerClassName="role-dialog-slug"
            label={copy.slug}
            maxLength={100}
            value={slug}
            error={slugError}
            hint={copy.slugHint}
            onChange={(value) => {
              setSlug(value.toUpperCase());
              setSlugEdited(true);
              setSlugTaken(false);
            }}
          />
        </div>
        <AppTextarea
          label={copy.descriptionField}
          placeholder={copy.descriptionPlaceholder}
          rows={2}
          maxLength={255}
          value={description}
          onChange={setDescription}
          hint={<span className="role-dialog-counter">{description.length}/255</span>}
        />
        <div className="role-dialog-section">
          <p className="role-dialog-section-label">{copy.initialPermissions}</p>
          {canManagePermissions ? (
            catalog.data ? (
              <PermissionGroups catalog={catalog.data} selected={permissions} actor={actor} onChange={setPermissions} />
            ) : (
              <div className="role-dialog-skeleton" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <DSkeleton key={index} height={44} />
                ))}
              </div>
            )
          ) : (
            <DAlert variant="info" role="status" title={copy.noPermissionManage[0]}>
              {copy.noPermissionManage[1]}
            </DAlert>
          )}
        </div>
      </form>
    </DDialog>
  );
}

/** Section E: the name and description of a custom role. */
export function EditRoleDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const copy = useRolesCopy();
  const shown = useShown(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!role) return;
    setName(role.name);
    setDescription(role.description ?? '');
    setAttempted(false);
    setAlert(null);
  }, [role]);

  const changed = Boolean(shown) && (name.trim() !== shown?.name || description.trim() !== (shown?.description ?? ''));
  const nameError = attempted && !name.trim() ? copy.nameEmpty : undefined;

  const update = useApiMutation(
    (input: { role: Role; name: string; description: string }) =>
      accessApi.updateRole(input.role.id, { name: input.name, description: input.description }),
    {
      success: (_, input) => copy.updated(input.name),
      invalidate: [accessKeys.all],
      toastErrors: false,
      onSuccess: onClose,
    },
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shown || !changed || update.isPending) return;
    if (!name.trim()) {
      setAttempted(true);
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    setAlert(null);
    try {
      await update.mutateAsync({ role: shown, name: name.trim(), description: description.trim() });
    } catch (cause) {
      setAlert(alertFor(cause, copy.permissionErrors));
    }
  }

  return (
    <DDialog
      open={role !== null}
      onClose={onClose}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={copy.editTitle}
      description={shown ? copy.editDescription(shown.slug) : undefined}
      footer={
        <Footer formId="edit-role-form" label={copy.save} saving={update.isPending} disabled={!changed} onCancel={onClose} />
      }
    >
      <form id="edit-role-form" className="role-dialog-form" noValidate onSubmit={submit}>
        <DialogAlert alert={alert} />
        <AppInput
          ref={nameRef}
          clearable={false}
          label={copy.name}
          maxLength={100}
          value={name}
          error={nameError}
          onChange={setName}
        />
        <AppTextarea
          label={copy.descriptionField}
          placeholder={copy.descriptionPlaceholder}
          rows={2}
          maxLength={255}
          value={description}
          onChange={setDescription}
          hint={<span className="role-dialog-counter">{description.length}/255</span>}
        />
      </form>
    </DDialog>
  );
}

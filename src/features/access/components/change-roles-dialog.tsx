import { DAlert, DCheckbox, DDialog, DSkeleton } from '@digvation/ui';
import { Info, Lock } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { accessApi, type User } from '../access-api';
import { accessKeys, useRoles, useUserRoles } from '../access-queries';
import { roleLock, type Actor } from '../user-rules';
import { useUsersCopy } from '../users-copy';
import './change-roles-dialog.css';

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((slug) => b.includes(slug));

/** Chooses the roles of one user (docs/design/03-change-roles.html). */
export function ChangeRolesDialog({ user, actor, onClose }: { user: User | null; actor: Actor; onClose: () => void }) {
  const usersCopy = useUsersCopy();
  const copy = usersCopy.roles;
  // Keeps the last user while the dialog closes, so its text does not jump.
  const [shown, setShown] = useState(user);
  if (user && user !== shown) setShown(user);

  const held = useUserRoles(user?.id);
  const roles = useRoles(user !== null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<[string, string] | null>(null);

  useEffect(() => {
    setError(null);
    if (held.data) setSelected(held.data);
  }, [held.data, user]);

  const name = shown?.fullname ?? '';
  const first = name.split(/\s+/)[0] ?? name;
  const loading = held.isPending || roles.isPending;
  const options = (roles.data ?? []).filter((role) => role.is_active);
  const changed = !loading && !sameSet(selected, held.data ?? []);

  const save = useApiMutation(
    (input: { user: User; slugs: string[] }) => accessApi.setUserRoles(input.user.id, { role_slugs: input.slugs }),
    {
      success: (_, input) => copy.saved(input.user.fullname),
      invalidate: [accessKeys.all],
      toastErrors: false,
      onSuccess: onClose,
    },
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shown || !changed || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({ user: shown, slugs: selected });
    } catch (cause) {
      const code = isApiError(cause) ? cause.code : undefined;
      const known = code ? copy.errors(first)[code] : undefined;
      setError(known ?? [friendlyErrorMessage(cause), '']);
      if (code === 'ROLE_NOT_ASSIGNABLE') {
        const fresh = (await roles.refetch()).data ?? [];
        const active = new Set(fresh.filter((role) => role.is_active).map((role) => role.slug));
        setSelected((current) => current.filter((slug) => active.has(slug)));
      }
    }
  }

  const toggle = (slug: string, on: boolean) =>
    setSelected((current) => (on ? [...current, slug] : current.filter((item) => item !== slug)));
  const chosenNames = options.filter((role) => selected.includes(role.slug)).map((role) => role.name);

  return (
    <DDialog
      open={user !== null}
      onClose={onClose}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={copy.title}
      description={shown ? copy.description(shown.fullname, shown.email) : undefined}
      footer={
        <div className="change-roles-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={save.isPending}>
            {usersCopy.cancel}
          </AppAction>
          <AppAction type="submit" form="change-roles-form" disabled={!changed} loading={save.isPending}>
            {save.isPending ? usersCopy.saving : copy.save}
          </AppAction>
        </div>
      }
    >
      <form id="change-roles-form" className="change-roles-form" noValidate onSubmit={submit}>
        {error ? (
          <DAlert variant="danger" title={error[0]}>
            {error[1] || null}
          </DAlert>
        ) : null}
        <p className="change-roles-lead">{copy.lead}</p>
        <fieldset className="change-roles-list" aria-busy={loading || undefined}>
          <legend className="visually-hidden">{copy.legend}</legend>
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="change-roles-option change-roles-skeleton" aria-hidden="true">
                  <DSkeleton height={16} width={16} />
                  <div className="change-roles-text">
                    <DSkeleton height={12} width="40%" />
                    <DSkeleton height={10} width="75%" />
                  </div>
                </div>
              ))
            : options.map((role) => {
                const lock = roleLock(role, actor, copy);
                const checked = selected.includes(role.slug);
                const hintId = `role-lock-${role.slug}`;
                return (
                  <label
                    key={role.slug}
                    className={`change-roles-option${checked ? ' change-roles-option-on' : ''}${lock ? ' change-roles-option-locked' : ''}`}
                  >
                    <DCheckbox
                      checked={checked}
                      disabled={Boolean(lock)}
                      aria-describedby={lock ? hintId : undefined}
                      onChange={(event) => toggle(role.slug, event.target.checked)}
                    />
                    <span className="change-roles-text">
                      <span className="change-roles-top">
                        <span className="change-roles-name">{role.name}</span>
                        {role.is_system ? <span className="change-roles-tag">{copy.system}</span> : null}
                        <span className="change-roles-count">
                          {role.permissions.includes('*') ? copy.allPermissions : copy.permissionCount(role.permissions.length)}
                        </span>
                      </span>
                      {role.description ? <span className="change-roles-description">{role.description}</span> : null}
                      {lock ? (
                        <span className="change-roles-lock" id={hintId}>
                          <Lock size={13} aria-hidden="true" />
                          {lock}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
        </fieldset>
        {loading ? null : (
          <>
            {selected.length ? (
              <p className="change-roles-summary">
                {copy.chosen} {chosenNames.join(', ')}
              </p>
            ) : (
              <DAlert variant="warning" role="status" title={copy.noRole(first)[0]}>
                {copy.noRole(first)[1]}
              </DAlert>
            )}
            {shown && shown.id === actor.id ? (
              <DAlert variant="info" role="status" title={copy.ownAccount[0]}>
                {copy.ownAccount[1]}
              </DAlert>
            ) : null}
            <p className="change-roles-note">
              <Info size={14} aria-hidden="true" />
              {copy.nextRequest(first)}
            </p>
          </>
        )}
      </form>
    </DDialog>
  );
}

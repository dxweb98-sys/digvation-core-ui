import { DCheckbox } from '@digvation/ui';
import { Lock } from 'lucide-react';
import { useId } from 'react';
import type { PermissionItem } from '../access-api';
import { canGrant, groupPermissions } from '../role-rules';
import { useRolesCopy } from '../roles-copy';
import type { Actor } from '../user-rules';
import './permission-groups.css';

/**
 * The catalog as approved groups of checkboxes (04-roles.html, section C).
 * Permissions the actor does not hold are locked. One toggle per group reads
 * "Pilih semua" until every unlocked permission is chosen, then "Kosongkan";
 * it changes unlocked permissions only.
 */
export function PermissionGroups({
  catalog,
  selected,
  actor,
  onChange,
}: {
  catalog: readonly PermissionItem[];
  selected: readonly string[];
  actor: Actor;
  onChange: (next: string[]) => void;
}) {
  const copy = useRolesCopy();
  const baseId = useId();
  const chosen = new Set(selected);

  const setMany = (slugs: readonly string[], on: boolean) => {
    const next = new Set(selected);
    for (const slug of slugs) {
      if (on) next.add(slug);
      else next.delete(slug);
    }
    onChange([...next]);
  };

  return (
    <div className="permission-groups">
      {groupPermissions(catalog).map((group) => {
        const labelId = `${baseId}-${group.key}`;
        const unlocked = group.items.filter((item) => canGrant(actor, item.slug)).map((item) => item.slug);
        const count = group.items.filter((item) => chosen.has(item.slug)).length;
        const allUnlockedChosen = unlocked.every((slug) => chosen.has(slug));
        return (
          <section key={group.key} className="permission-group" role="group" aria-labelledby={labelId}>
            <header className="permission-group-head">
              <span className="permission-group-name" id={labelId}>
                {copy.groups[group.key]}
              </span>
              <span className="permission-group-count">
                {count}/{group.items.length}
              </span>
              {unlocked.length ? (
                <button
                  type="button"
                  className="permission-group-link"
                  onClick={() => setMany(unlocked, !allUnlockedChosen)}
                >
                  {allUnlockedChosen ? copy.clear : copy.selectAll}
                </button>
              ) : null}
            </header>
            <div className="permission-group-grid">
              {group.items.map((item) => {
                const locked = !canGrant(actor, item.slug);
                const hintId = `${baseId}-${item.slug}-lock`;
                return (
                  <label key={item.slug} className={`permission-item${locked ? ' permission-item-locked' : ''}`}>
                    <DCheckbox
                      checked={chosen.has(item.slug)}
                      disabled={locked}
                      aria-describedby={locked ? hintId : undefined}
                      onChange={(event) => setMany([item.slug], event.target.checked)}
                    />
                    <span className="permission-item-text">
                      <span className="permission-item-label">{copy.permissionLabels[item.slug] ?? item.name}</span>
                      <span className="permission-item-slug">{item.slug}</span>
                      {locked ? (
                        <span className="permission-item-lock" id={hintId}>
                          <Lock size={12} aria-hidden="true" />
                          {copy.locks.permissionNotHeld}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

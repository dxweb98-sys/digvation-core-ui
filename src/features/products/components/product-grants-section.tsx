import { DBadge, DCheckbox, useToast } from '@digvation/ui';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { labelFor } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { DialogSection } from '../../../shared/ui/app-dialog';
import { focusFirstInvalid } from '../../../shared/ui/form-fields';
import { NotSet } from '../../../shared/ui/not-set';
import { useMappingVocabulary } from '../hooks/use-mapping-vocabulary';
import { useUpdateProductMapping } from '../hooks/use-product-mutations';
import type { ProductDetail } from '../types/product';

const FORM_ID = 'product-grants-form';
const DOMAIN_ERROR_ID = 'product-grants-domain-error';
const NOT_SERVED = 'Not served by Runtime yet';
const BACKOFFICE_NOTE = 'Included with every active offering';

function GrantName({ code }: { code: string }) {
  return (
    <span className="product-grant-name">
      <span>{labelFor(code)}</span>
      <code className="product-code">{code}</code>
    </span>
  );
}

const sameCodes = (left: ReadonlySet<string>, right: readonly string[]) =>
  left.size === right.length && right.every((code) => left.has(code));

export function ProductGrantsSection({
  detail,
  canEdit,
  showReadOnlyNote,
}: {
  detail: ProductDetail;
  canEdit: boolean;
  showReadOnlyNote: boolean;
}) {
  const { product, domainCodes } = detail;
  const vocabulary = useMappingVocabulary();
  const updateMapping = useUpdateProductMapping(product.id);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<Set<string>>(new Set());
  const [domainError, setDomainError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const implicitApplications = (vocabulary.data?.applications ?? []).filter(
    (application) => application.implicit,
  );
  const grantableApplications = (vocabulary.data?.applications ?? []).filter(
    (application) => application.grantable,
  );
  const isImplicit = (code: string) =>
    implicitApplications.some((application) => application.code === code);
  const grantedApplications = detail.applicationCodes.filter(
    (code) => !isImplicit(code),
  );
  const isServed = (code: string) =>
    vocabulary.data?.domains.find((domain) => domain.code === code)?.served !==
    false;

  function beginEditing() {
    setDomains(new Set(domainCodes));
    setApplications(new Set(grantedApplications));
    setDomainError(null);
    setSubmitError(null);
    setIsEditing(true);
  }

  function toggle(
    update: typeof setDomains,
    code: string,
    checked: boolean,
  ) {
    update((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
    setSubmitError(null);
  }

  async function save() {
    if (product.status === 'ACTIVE' && domains.size === 0) {
      setDomainError('An active offering needs at least one domain.');
      focusFirstInvalid(FORM_ID);
      return;
    }
    setDomainError(null);
    setSubmitError(null);
    try {
      await updateMapping.mutateAsync({
        domainCodes: [...domains],
        applicationCodes: [...applications],
      });
      setIsEditing(false);
      showToast({ title: 'Grants updated', variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The grants could not be saved.';
      setSubmitError(message);
      showToast({
        title: 'Grants not updated',
        description: message,
        variant: 'danger',
      });
    }
  }

  const unchanged =
    sameCodes(domains, domainCodes) &&
    sameCodes(applications, grantedApplications);

  return (
    <DialogSection title="What this offering grants">
      <div className="product-grants">
        {!isEditing ? (
          <>
            <div className="product-grant-group">
              <h5>Domains</h5>
              {domainCodes.length ? (
                <ul>
                  {domainCodes.map((code) => (
                    <li key={code}>
                      <GrantName code={code} />
                      {isServed(code) ? null : (
                        <DBadge variant="secondary">{NOT_SERVED}</DBadge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <NotSet />
              )}
              {product.status === 'DRAFT' && domainCodes.length === 0 ? (
                <p className="product-grant-note">
                  Add a domain before activating this offering.
                </p>
              ) : null}
            </div>
            <div className="product-grant-group">
              <h5>Applications</h5>
              {grantedApplications.length === 0 ? (
                <NotSet field="Operational apps" />
              ) : null}
              <ul>
                {grantedApplications.map((code) => (
                  <li key={code}>
                    <GrantName code={code} />
                  </li>
                ))}
                {implicitApplications.map(({ code }) => (
                  <li key={code}>
                    <GrantName code={code} />
                    <span className="product-grant-note">{BACKOFFICE_NOTE}</span>
                  </li>
                ))}
              </ul>
            </div>
            {product.status === 'RETIRED' ? (
              <p className="product-grant-note">
                Retired products cannot be edited.
              </p>
            ) : canEdit ? (
              <div className="product-grants-actions">
                <AppAction
                  icon={Pencil}
                  tone="secondary"
                  onClick={beginEditing}
                  disabled={!vocabulary.data}
                >
                  Edit grants
                </AppAction>
              </div>
            ) : showReadOnlyNote ? (
              <p className="product-grant-note">
                Changing this needs the Update permission under Products.
              </p>
            ) : null}
            {vocabulary.isError ? (
              <div className="product-grants-actions">
                <p className="product-grant-note" role="alert">
                  The list of domains and applications could not be loaded.
                </p>
                <AppAction
                  tone="secondary"
                  onClick={() => void vocabulary.refetch()}
                >
                  Retry
                </AppAction>
              </div>
            ) : null}
          </>
        ) : (
          <div className="product-grants-form" id={FORM_ID}>
            {product.status === 'ACTIVE' ? (
              <p className="product-grant-note">
                This offering is active. CORE blocks these changes while clients
                hold it, and says how many.
              </p>
            ) : null}
            <fieldset aria-describedby={domainError ? DOMAIN_ERROR_ID : undefined}>
              <legend>Domains</legend>
              {vocabulary.data?.domains.map(({ code, served }) => (
                <label key={code} className="product-grant-option">
                  <DCheckbox
                    aria-label={labelFor(code)}
                    aria-invalid={domainError ? true : undefined}
                    aria-describedby={domainError ? DOMAIN_ERROR_ID : undefined}
                    checked={domains.has(code)}
                    disabled={updateMapping.isPending}
                    onChange={(event) => {
                      toggle(setDomains, code, event.target.checked);
                      setDomainError(null);
                    }}
                  />
                  <GrantName code={code} />
                  {served ? null : (
                    <DBadge variant="secondary">{NOT_SERVED}</DBadge>
                  )}
                </label>
              ))}
              {domainError ? (
                <p className="product-grants-error" id={DOMAIN_ERROR_ID}>
                  {domainError}
                </p>
              ) : null}
            </fieldset>
            <fieldset>
              <legend>Applications</legend>
              {grantableApplications.map(({ code }) => (
                <label key={code} className="product-grant-option">
                  <DCheckbox
                    aria-label={labelFor(code)}
                    checked={applications.has(code)}
                    disabled={updateMapping.isPending}
                    onChange={(event) =>
                      toggle(setApplications, code, event.target.checked)
                    }
                  />
                  <GrantName code={code} />
                </label>
              ))}
              {implicitApplications.map(({ code }) => (
                <div key={code} className="product-grant-option is-read-only">
                  <GrantName code={code} />
                  <span className="product-grant-note">{BACKOFFICE_NOTE}</span>
                </div>
              ))}
            </fieldset>
            {submitError ? (
              <p className="product-grants-error" role="alert">
                {submitError}
              </p>
            ) : null}
            <div className="product-grants-actions">
              <AppAction
                tone="secondary"
                onClick={() => setIsEditing(false)}
                disabled={updateMapping.isPending}
              >
                Cancel
              </AppAction>
              <AppAction
                onClick={() => void save()}
                loading={updateMapping.isPending}
                disabled={unchanged}
              >
                Save grants
              </AppAction>
            </div>
          </div>
        )}
      </div>
    </DialogSection>
  );
}

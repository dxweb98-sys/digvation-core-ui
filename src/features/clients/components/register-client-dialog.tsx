import { DAlert, DCheckbox, DDialog } from '@digvation/ui';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import type { Dto } from '../../../shared/api/types';
import { normalizePhoneInput } from '../../../shared/format/phone';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput, AppSelect, AppTextarea, focusFirstInvalid } from '../../../shared/ui/form-fields';
import { clientsApi } from '../clients-api';
import { clientPaths } from '../client-paths';
import { ALIAS, aliasFromName, EMAIL } from '../client-rules';
import { useClientsCopy } from '../clients-copy';
import { clientKeys, useActiveBusinessTypes } from '../clients-queries';

type Field = 'name' | 'email' | 'phone' | 'address' | 'alias' | 'legal' | 'brandName' | 'businessType' | 'customType';
const FORM = 'register-client-form';
const OTHER = '__other';

/** CORE's field names in a validation refusal, to this form's fields. */
const SERVER_FIELDS: Record<string, Field> = {
  full_name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  'business.alias': 'alias',
  'business.legal': 'legal',
  'business.brand.name': 'brandName',
  'business.brand.business_type_id': 'businessType',
  'business.brand.custom_business_type': 'customType',
};

/** Register client (docs/design/07-clients.html, section E): POST /clients, saved as a draft. */
export function RegisterClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [opening, setOpening] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpening((value) => value + 1);
  }
  // A new key gives every open an empty form.
  return <RegisterClientForm key={opening} open={open} onClose={onClose} />;
}

function RegisterClientForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const copy = useClientsCopy();
  const text = copy.registerDialog;
  const navigate = useNavigate();
  const types = useActiveBusinessTypes(open);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [alias, setAlias] = useState('');
  // The alias follows the client name until the operator edits it.
  const [aliasEdited, setAliasEdited] = useState(false);
  const [legal, setLegal] = useState('');
  const [withBrand, setWithBrand] = useState(true);
  const [brandName, setBrandName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customType, setCustomType] = useState('');
  const [server, setServer] = useState<Partial<Record<Field, string>>>({});
  const [alert, setAlert] = useState<string | null>(null);

  const register = useApiMutation((body: Dto<'CreateClientDto'>) => clientsApi.create(body), {
    success: text.done,
    invalidate: [clientKeys.all],
    toastErrors: false,
    onSuccess: (result) => {
      onClose();
      navigate(clientPaths.client(result.client_id));
    },
  });

  const { field, allowSubmit } = useFieldErrors<Field>(FORM, () => {
    const problems: Partial<Record<Field, string>> = {};
    if (!name.trim()) problems.name = copy.required;
    if (!email.trim()) problems.email = copy.required;
    else if (!EMAIL.test(email.trim())) problems.email = copy.emailInvalid;
    if (!phone.trim()) problems.phone = copy.required;
    else if (!normalizePhoneInput(phone)) problems.phone = copy.phoneInvalid;
    if (!alias.trim()) problems.alias = copy.required;
    else if (!ALIAS.test(alias.trim())) problems.alias = text.aliasInvalid;
    if (withBrand) {
      if (!brandName.trim()) problems.brandName = copy.required;
      if (!businessType) problems.businessType = text.businessTypeEmpty;
      else if (businessType === OTHER && !customType.trim()) problems.customType = copy.required;
    }
    return problems;
  });
  const fieldProps = (key: Field) => {
    const own = field(key);
    return { ...own, error: own.error ?? server[key] };
  };
  const edit = (key: Field, set: (value: string) => void) => (value: string) => {
    set(value);
    setServer((current) => ({ ...current, [key]: undefined }));
  };

  function changeName(value: string) {
    edit('name', setName)(value);
    if (!aliasEdited) {
      setAlias(aliasFromName(value));
      setServer((current) => ({ ...current, alias: undefined }));
    }
  }

  function body(): Dto<'CreateClientDto'> {
    const brand = withBrand
      ? {
          name: brandName.trim(),
          ...(businessType === OTHER ? { custom_business_type: customType.trim() } : { business_type_id: businessType }),
        }
      : undefined;
    return {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      ...(address.trim() ? { address: address.trim() } : {}),
      business: {
        alias: alias.trim(),
        ...(legal.trim() ? { legal: legal.trim() } : {}),
        // Without the first brand, business.brand is not sent at all.
        ...(brand ? { brand } : {}),
      },
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (register.isPending) return;
    setServer({});
    setAlert(null);
    if (!allowSubmit()) return;
    try {
      await register.mutateAsync(body());
    } catch (cause) {
      const mapped: Partial<Record<Field, string>> = {};
      if (isApiError(cause, 'BUSINESS_ALIAS_CONFLICT')) mapped.alias = text.aliasTaken;
      else if (isApiError(cause, 'BRAND_NAME_CONFLICT')) mapped.brandName = text.brandTaken;
      else if (isApiError(cause) && cause.status === 400) {
        for (const detail of cause.details) {
          const key = detail.field ? SERVER_FIELDS[detail.field] : undefined;
          if (!key || mapped[key]) continue;
          mapped[key] = detail.reason === 'phone_format' ? copy.phoneInvalid : detail.message;
        }
      }
      if (Object.keys(mapped).length) {
        setServer(mapped);
        focusFirstInvalid(FORM);
      } else setAlert(friendlyErrorMessage(cause));
    }
  }

  const typeOptions = [
    ...(types.data ?? []).map((type) => ({ value: type.id, label: type.name })),
    { value: OTHER, label: text.businessTypeOther },
  ];

  return (
    <DDialog
      open={open}
      onClose={() => !register.isPending && onClose()}
      size="lg"
      overlayClassName="app-dialog-overlay"
      title={text.title}
      description={text.description}
      footer={
        <div className="clients-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={register.isPending}>
            {copy.cancel}
          </AppAction>
          <AppAction type="submit" form={FORM} loading={register.isPending}>
            {register.isPending ? text.submitting : text.submit}
          </AppAction>
        </div>
      }
    >
      <form id={FORM} className="clients-form" noValidate onSubmit={submit}>
        {alert ? <DAlert variant="danger" title={alert} /> : null}
        <section className="clients-form-section" aria-labelledby={`${FORM}-client`}>
          <h3 id={`${FORM}-client`}>{text.client}</h3>
          <AppInput clearable={false} {...fieldProps('name')} label={text.name} autoComplete="organization" maxLength={254} value={name} onChange={changeName} />
          <div className="clients-form-pair">
            <AppInput clearable={false} {...fieldProps('email')} label={text.email} type="email" autoComplete="email" maxLength={254} value={email} onChange={edit('email', setEmail)} />
            <AppInput clearable={false} {...fieldProps('phone')} label={text.phone} hint={text.phoneHint} autoComplete="tel" inputMode="tel" maxLength={40} value={phone} onChange={edit('phone', setPhone)} />
          </div>
          <AppTextarea clearable={false} {...fieldProps('address')} label={text.address} rows={2} maxLength={500} value={address} onChange={edit('address', setAddress)} />
        </section>

        <section className="clients-form-section" aria-labelledby={`${FORM}-business`}>
          <h3 id={`${FORM}-business`}>{text.business}</h3>
          <AppInput
            clearable={false}
            {...fieldProps('alias')}
            label={text.alias}
            hint={text.aliasHint}
            containerClassName="clients-alias-input"
            autoCapitalize="characters"
            maxLength={20}
            value={alias}
            onChange={(value) => {
              setAliasEdited(true);
              edit('alias', setAlias)(value.toUpperCase());
            }}
          />
          <AppInput clearable={false} {...fieldProps('legal')} label={text.legal} hint={text.legalHint} maxLength={254} value={legal} onChange={edit('legal', setLegal)} />
        </section>

        <section className="clients-form-section" aria-labelledby={`${FORM}-brand`}>
          <h3 id={`${FORM}-brand`}>{text.brand}</h3>
          <label className="clients-check">
            <DCheckbox checked={withBrand} onChange={(event) => setWithBrand(event.target.checked)} />
            <span>{text.addBrand}</span>
          </label>
          {withBrand ? (
            <>
              <div className="clients-form-pair">
                <AppInput clearable={false} {...fieldProps('brandName')} label={text.brandName} maxLength={254} value={brandName} onChange={edit('brandName', setBrandName)} />
                <AppSelect
                  {...fieldProps('businessType')}
                  label={text.businessType}
                  placeholder={text.businessTypePlaceholder}
                  options={typeOptions}
                  loading={types.isPending}
                  value={businessType || null}
                  onChange={(value) => edit('businessType', setBusinessType)(value ? String(value) : '')}
                />
              </div>
              {businessType === OTHER ? (
                <AppInput clearable={false} {...fieldProps('customType')} label={text.customType} maxLength={254} value={customType} onChange={edit('customType', setCustomType)} />
              ) : null}
            </>
          ) : (
            <p className="clients-muted clients-small clients-later">{text.brandLater}</p>
          )}
        </section>
      </form>
    </DDialog>
  );
}

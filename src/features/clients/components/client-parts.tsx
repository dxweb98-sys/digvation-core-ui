import { DBadge, type BadgeVariant } from '@digvation/ui';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatPhone } from '../../../shared/format/phone';
import type { BillTo, BusinessBrand, ClientStatus, Contact, Recipients, ResolvedContact } from '../clients-api';
import { businessTypeOf, contactFlags } from '../client-rules';
import { useClientsCopy } from '../clients-copy';

const STATUS_VARIANTS: Record<ClientStatus, BadgeVariant> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ARCHIVED: 'default',
};

export function ClientStatusPill({ status }: { status: ClientStatus }) {
  const copy = useClientsCopy();
  return <DBadge variant={STATUS_VARIANTS[status]}>{copy.status[status]}</DBadge>;
}

/** Brand and legal entity status: ACTIVE or ARCHIVED. */
export function RecordStatusPill({ status }: { status: 'ACTIVE' | 'ARCHIVED' }) {
  const copy = useClientsCopy();
  return <DBadge variant={status === 'ACTIVE' ? 'success' : 'default'}>{copy.recordStatus[status]}</DBadge>;
}

/** A small uppercase heading with an optional count: "BISNIS 2". */
export function CardHeading({ title, count, first = false }: { title: string; count?: number; first?: boolean }) {
  return (
    <h2 className={`clients-heading${first ? '' : ' clients-heading-gap'}`}>
      {title}
      {count === undefined ? null : <span className="clients-muted"> {count}</span>}
    </h2>
  );
}

export function InfoCard({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="clients-card" aria-label={label}>
      {children}
    </section>
  );
}

/** One label and value row; an empty value reads "Belum diisi". */
export function InfoRow({ label, children, source }: { label: string; children?: ReactNode; source?: string }) {
  const copy = useClientsCopy();
  const empty = children === null || children === undefined || children === '';
  return (
    <div className="clients-row">
      <span className="clients-key">{label}</span>
      <span className="clients-value">
        {empty ? <span className="clients-muted">{copy.notSet}</span> : children}
        {source ? <span className="clients-source">{source}</span> : null}
      </span>
    </div>
  );
}

/** A row that opens a page: a link reachable by keyboard, with the chevron. */
export function LinkRow({ to, label, children, aside }: { to: string; label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Link to={to} className="clients-row clients-link-row" aria-label={label}>
      <span className="clients-two">{children}</span>
      <span className="clients-row-aside">
        {aside}
        <ChevronRight size={16} aria-hidden="true" className="clients-chevron" />
      </span>
    </Link>
  );
}

/**
 * Billing as CORE resolves it (client-resolution.ts billToOf, recipientsFor,
 * primaryOf), each value with where it comes from.
 */
export function BillingRows({
  billTo,
  recipients,
  contact,
  brandRecipients = false,
}: {
  billTo: BillTo;
  recipients: Recipients;
  contact?: ResolvedContact;
  /** The billing contacts are narrowed to the brand shown. */
  brandRecipients?: boolean;
}) {
  const copy = useClientsCopy();
  const recipientSource =
    recipients.source === 'CONTACTS' && brandRecipients ? copy.brandRecipients : copy.recipientSource[recipients.source];
  return (
    <>
      <InfoRow label={copy.billingRows.billedTo} source={copy.nameSource[billTo.name_source]}>
        {billTo.name}
      </InfoRow>
      <InfoRow
        label={copy.billingRows.address}
        source={billTo.address && billTo.address_source ? copy.addressSource[billTo.address_source] : undefined}
      >
        {billTo.address}
      </InfoRow>
      <InfoRow label={copy.billingRows.recipients} source={recipients.emails.length ? recipientSource : undefined}>
        {recipients.emails.join(', ')}
      </InfoRow>
      {contact ? (
        <InfoRow label={copy.billingRows.contact} source={copy.contactSource[contact.email_source]}>
          {[contact.email, formatPhone(contact.phone)].filter(Boolean).join(' · ')}
        </InfoRow>
      ) : null}
    </>
  );
}

export function ContactRow({ contact, brands, showBrand = true }: { contact: Contact; brands: readonly BusinessBrand[]; showBrand?: boolean }) {
  const copy = useClientsCopy();
  const brand = contact.brand_id ? brands.find((item) => item.id === contact.brand_id) : undefined;
  const reach = [contact.email, formatPhone(contact.phone)].filter(Boolean).join(' · ');
  return (
    <div className="clients-row clients-contact">
      <span className="clients-two">
        <span className="clients-name">
          {contact.name}
          {contact.position ? <span className="clients-muted clients-small"> · {contact.position}</span> : null}
        </span>
        {reach ? <span className="clients-muted clients-small">{reach}</span> : null}
        {showBrand && brand ? <span className="clients-muted clients-small">{copy.brandOnly(brand.name)}</span> : null}
      </span>
      <span className="clients-flags">
        {contactFlags(contact).map((flag) => (
          <DBadge key={flag}>{copy.flags[flag]}</DBadge>
        ))}
      </span>
    </div>
  );
}

export function BrandSummary({ brand }: { brand: Pick<BusinessBrand, 'name' | 'business_type' | 'custom_business_type' | 'website'> }) {
  const sub = [businessTypeOf(brand), brand.website].filter(Boolean).join(' · ');
  return (
    <>
      <span className="clients-name">{brand.name}</span>
      {sub ? <span className="clients-muted clients-small">{sub}</span> : null}
    </>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="clients-row clients-empty-row">
      <span className="clients-muted">{children}</span>
    </div>
  );
}

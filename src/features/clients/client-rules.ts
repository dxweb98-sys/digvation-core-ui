import type { BusinessBrand, Contact, ClientStatus } from './clients-api';

/** The transitions CORE allows (core-v2 client.lifecycle.ts, CLIENT_TRANSITIONS), in the order the dialog shows them. */
export const CLIENT_TRANSITIONS: Record<ClientStatus, readonly ClientStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

export const CLIENT_STATUSES: readonly ClientStatus[] = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'];

/** CORE's business alias: trimmed and uppercased, then A-Z, 0-9 and -, at most 20. */
export const ALIAS = /^[A-Z0-9-]{1,20}$/;

/** The alias suggested from a client name: its first word, uppercased, kept to A-Z, 0-9 and -, at most 20. */
export function aliasFromName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactFlag = 'primary' | 'billing' | 'technical' | 'pic';

export function contactFlags(contact: Contact): ContactFlag[] {
  const flags: ContactFlag[] = [];
  if (contact.is_primary) flags.push('primary');
  if (contact.is_billing) flags.push('billing');
  if (contact.is_technical) flags.push('technical');
  if (contact.is_pic) flags.push('pic');
  return flags;
}

/**
 * Whether a brand's invoices go to billing contacts narrowed to that brand
 * (client-resolution.ts recipientsFor: brand billing contacts first).
 */
export function billsBrandContacts(brandId: string, contacts: readonly Contact[]) {
  return contacts.some((contact) => contact.brand_id === brandId && contact.is_billing && contact.email);
}

/** The business type a brand shows: the master value, or its custom label. */
export function businessTypeOf(brand: Pick<BusinessBrand, 'business_type' | 'custom_business_type'>) {
  return brand.business_type?.name ?? brand.custom_business_type ?? null;
}

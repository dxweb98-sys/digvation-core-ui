import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Client = Dto<'ClientDto'>;
export type ClientDetail = Dto<'ClientDetailDto'>;
export type ClientStatus = Client['status'];
export type ClientGroup = Dto<'ClientGroupWithBrandsDto'>;
export type ClientGroupSummary = Dto<'ClientGroupDto'>;
export type Brand = Dto<'BrandDto'>;
export type BrandWithBilling = Dto<'BrandWithBillingDto'>;
export type BrandDetail = Dto<'BrandDetailDto'>;
export type Contact = Dto<'ClientContactDto'>;
export type LegalEntity = Dto<'LegalEntityDto'>;
export type LegalEntityStatus = LegalEntity['status'];

/**
 * Every brand of a client, grouped or not: the client detail nests a grouped
 * brand inside its group and leaves only the ungrouped ones in `brands`.
 */
export function clientBrands(client: ClientDetail): Brand[] {
  return [...client.groups.flatMap((group) => group.brands), ...client.brands].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/**
 * CORE's schema types a nullable uuid reference as an object while the answer is
 * the id string or null. This reads it the way forms and links need it.
 */
export function uuidRef(value: string | Record<string, never> | null | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/** Statuses a client may move to from its current one (core-v2 client.lifecycle.ts). */
export const CLIENT_TRANSITIONS: Record<ClientStatus, readonly ClientStatus[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

/** Statuses a legal entity may move to from its current one (core-v2 legal-entity lifecycle). */
export const LEGAL_ENTITY_TRANSITIONS: Record<LegalEntityStatus, readonly LegalEntityStatus[]> = {
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

/**
 * CORE types a nullable uuid reference as an object in its generated schema, so
 * these inputs carry the value the way the operator's form holds it: an id or null.
 */
export interface BrandInput {
  code?: string;
  name: string;
  description?: string | null;
  website?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  /** The brand's own bill-to. Null falls back to the group default, then the client. */
  legal_entity_id?: string | null;
}

export interface GroupInput {
  /** Left out when a group starts from a brand: CORE then names it after the brand. */
  name?: string;
  notes?: string | null;
  default_legal_entity_id?: string | null;
}

export const clientsApi = {
  list: (query: Query) => api.list<Client>('/clients', query),
  detail: (clientId: string) => api.get<ClientDetail>(`/clients/${seg(clientId)}`),
  create: (body: Dto<'CreateClientDto'>) => api.post<Dto<'ClientCreatedResponseDto'>>('/clients', body),
  update: (clientId: string, body: Dto<'UpdateClientDto'>) =>
    api.patch<Dto<'ClientMutationResponseDto'>>(`/clients/${seg(clientId)}`, body),
  transition: (clientId: string, body: Dto<'ClientLifecycleTransitionDto'>) =>
    api.patch<Dto<'ClientLifecycleResponseDto'>>(`/clients/${seg(clientId)}/status`, body),

  brands: (clientId: string) => api.get<Dto<'BrandListDto'>>(`/clients/${seg(clientId)}/brands`),
  createBrand: (clientId: string, body: BrandInput) =>
    api.post<Dto<'BrandMutationResponseDto'>>(`/clients/${seg(clientId)}/brands`, body),
  updateBrand: (clientId: string, brandId: string, body: BrandInput) =>
    api.patch<Dto<'BrandMutationResponseDto'>>(`/clients/${seg(clientId)}/brands/${seg(brandId)}`, body),
  transitionBrand: (clientId: string, brandId: string, body: Dto<'BrandLifecycleTransitionDto'>) =>
    api.patch<Dto<'BrandLifecycleResponseDto'>>(
      `/clients/${seg(clientId)}/brands/${seg(brandId)}/status`,
      body,
    ),

  createContact: (clientId: string, body: Dto<'CreateClientContactDto'>) =>
    api.post<Dto<'ClientContactMutationResponseDto'>>(`/clients/${seg(clientId)}/contacts`, body),
  updateContact: (clientId: string, contactId: string, body: Dto<'UpdateClientContactDto'>) =>
    api.patch<Dto<'ClientContactMutationResponseDto'>>(
      `/clients/${seg(clientId)}/contacts/${seg(contactId)}`,
      body,
    ),
  deleteContact: (clientId: string, contactId: string) =>
    api.delete<Dto<'ClientContactMutationResponseDto'>>(`/clients/${seg(clientId)}/contacts/${seg(contactId)}`),

  legalEntities: (clientId: string) => api.get<Dto<'LegalEntityListDto'>>(`/clients/${seg(clientId)}/legal-entities`),
  createLegalEntity: (clientId: string, body: Dto<'CreateLegalEntityDto'>) =>
    api.post<Dto<'LegalEntityMutationResponseDto'>>(`/clients/${seg(clientId)}/legal-entities`, body),
  updateLegalEntity: (clientId: string, legalEntityId: string, body: Dto<'UpdateLegalEntityDto'>) =>
    api.patch<Dto<'LegalEntityMutationResponseDto'>>(
      `/clients/${seg(clientId)}/legal-entities/${seg(legalEntityId)}`,
      body,
    ),
  transitionLegalEntity: (clientId: string, legalEntityId: string, body: Dto<'LegalEntityLifecycleTransitionDto'>) =>
    api.patch<Dto<'LegalEntityLifecycleResponseDto'>>(
      `/clients/${seg(clientId)}/legal-entities/${seg(legalEntityId)}/status`,
      body,
    ),

  createGroup: (clientId: string, body: GroupInput) =>
    api.post<Dto<'ClientGroupCreatedResponseDto'>>(`/clients/${seg(clientId)}/groups`, body),
  updateGroup: (clientId: string, groupId: string, body: GroupInput) =>
    api.patch<Dto<'ClientGroupMutationResponseDto'>>(`/clients/${seg(clientId)}/groups/${seg(groupId)}`, body),
  deleteGroup: (clientId: string, groupId: string) =>
    api.delete<Dto<'ClientGroupMutationResponseDto'>>(`/clients/${seg(clientId)}/groups/${seg(groupId)}`),
  /** Moves a brand into another group of the same client; the group it leaves is deleted once empty. */
  moveBrandToGroup: (clientId: string, brandId: string, body: { group_id: string }) =>
    api.put<Dto<'BrandGroupMembershipResponseDto'>>(`/clients/${seg(clientId)}/brands/${seg(brandId)}/group`, body),
  /** Creates a group named in the request and moves the brand into it. */
  startBrandGroup: (clientId: string, brandId: string, body: GroupInput) =>
    api.post<Dto<'BrandGroupMembershipResponseDto'>>(`/clients/${seg(clientId)}/brands/${seg(brandId)}/group`, body),

  brandDetail: (clientId: string, brandId: string) =>
    api.get<Dto<'BrandDetailDto'>>(`/clients/${seg(clientId)}/brands/${seg(brandId)}`),
};

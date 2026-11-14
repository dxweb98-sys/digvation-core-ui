import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Client = Dto<'ClientDto'>;
export type ClientDetail = Dto<'ClientDetailDto'>;
export type ClientStatus = Client['status'];
export type Brand = Dto<'BrandDto'>;
export type BrandWithBilling = Dto<'BrandWithBillingDto'>;
export type Contact = Dto<'ClientContactDto'>;

/** Statuses a client may move to from its current one (core-v2 client.lifecycle.ts). */
export const CLIENT_TRANSITIONS: Record<ClientStatus, readonly ClientStatus[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

export const clientsApi = {
  list: (query: Query) => api.list<Client>('/clients', query),
  detail: (clientId: string) => api.get<ClientDetail>(`/clients/${seg(clientId)}`),
  create: (body: Dto<'CreateClientDto'>) => api.post<Dto<'ClientCreatedResponseDto'>>('/clients', body),
  update: (clientId: string, body: Dto<'UpdateClientDto'>) =>
    api.patch<Dto<'ClientMutationResponseDto'>>(`/clients/${seg(clientId)}`, body),
  transition: (clientId: string, body: Dto<'ClientLifecycleTransitionDto'>) =>
    api.patch<Dto<'ClientLifecycleResponseDto'>>(`/clients/${seg(clientId)}/status`, body),

  brands: (clientId: string) => api.get<Dto<'BrandListDto'>>(`/clients/${seg(clientId)}/brands`),
  createBrand: (clientId: string, body: Dto<'CreateBrandDto'>) =>
    api.post<Dto<'BrandMutationResponseDto'>>(`/clients/${seg(clientId)}/brands`, body),
  updateBrand: (clientId: string, brandId: string, body: Dto<'UpdateBrandDto'>) =>
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
};

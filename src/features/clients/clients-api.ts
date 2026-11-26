import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Client = Dto<'ClientDto'>;
export type ClientStatus = Client['status'];
export type ClientDetail = Dto<'ClientDetailDto'>;
export type Business = Dto<'ClientDetailBusinessDto'>;
export type BusinessBrand = Dto<'ClientDetailBrandDto'>;
export type Contact = Dto<'ClientDetailContactDto'>;
export type LegalEntity = Dto<'ClientDetailLegalEntityDto'>;
export type BrandDetail = Dto<'BrandDetailDto'>;
export type BillTo = Dto<'BillToDto'>;
export type Recipients = Dto<'RecipientsDto'>;
export type ResolvedContact = Dto<'ResolvedContactDto'>;
export type BusinessType = Dto<'BusinessTypeDto'>;

export const clientsApi = {
  list: (query: Query) => api.list<Client>('/clients', query),
  detail: (clientId: string) => api.get<ClientDetail>(`/clients/${seg(clientId)}`),
  create: (body: Dto<'CreateClientDto'>) => api.post<Dto<'ClientMutationResponseDto'>>('/clients', body),
  update: (clientId: string, body: Dto<'UpdateClientDto'>) =>
    api.patch<Dto<'ClientMutationResponseDto'>>(`/clients/${seg(clientId)}`, body),
  transition: (clientId: string, body: Dto<'ClientLifecycleTransitionDto'>) =>
    api.patch<Dto<'ClientLifecycleResponseDto'>>(`/clients/${seg(clientId)}/status`, body),
  brand: (clientId: string, brandId: string) =>
    api.get<BrandDetail>(`/clients/${seg(clientId)}/brands/${seg(brandId)}`),
  /**
   * GET /business-types/active answers `{ items }` (business-type.controller.ts
   * listActive); docs/openapi.json still describes one BusinessTypeDto.
   */
  activeBusinessTypes: () => api.get<{ items: BusinessType[] }>('/business-types/active'),
};

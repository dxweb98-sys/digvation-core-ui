export type ClientStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface Client {
  id: string;
  code: string;
  displayName: string;
  legalName?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  website?: string;
  taxIdentifier?: string;
  country?: string;
  timezone?: string;
  address?: string;
  notes?: string;
  status: ClientStatus;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListQuery {
  search: string;
  status: ClientStatus | 'ALL';
  page: number;
  limit: number;
}

export interface ClientListItem extends Client {
  productCount: number;
}

export interface ClientListResult {
  clients: ClientListItem[];
  total: number;
  totalPages: number;
}

export interface ClientActivity {
  id: string;
  type: 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_STATUS_CHANGED';
  title: string;
  description: string;
  occurredAt: string;
}

export interface ClientDetail {
  client: Client;
  activity: ClientActivity[];
}

export interface CreateClientInput {
  code: string;
  displayName: string;
  legalName?: string;
}

export interface UpdateClientInput {
  displayName: string;
  legalName?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  website?: string;
  taxIdentifier?: string;
  country?: string;
  timezone?: string;
  address?: string;
  notes?: string;
}

export interface ClientStatusTransitionInput {
  clientId: string;
  targetStatus: ClientStatus;
  reason: string;
}

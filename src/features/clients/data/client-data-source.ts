import type {
  ClientDetail,
  ClientListQuery,
  ClientListResult,
  ClientStatusTransitionInput,
  CreateClientInput,
  UpdateClientInput,
} from '../types/client';

export interface ClientDataSource {
  getClients(query: ClientListQuery): Promise<ClientListResult>;
  getClientDetail(clientId: string): Promise<ClientDetail | null>;
  createClient(input: CreateClientInput): Promise<ClientDetail>;
  updateClient(clientId: string, input: UpdateClientInput): Promise<ClientDetail>;
  transitionClientStatus(input: ClientStatusTransitionInput): Promise<ClientDetail>;
}

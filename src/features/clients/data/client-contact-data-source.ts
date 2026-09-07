import type { ClientContact, ClientContactInput } from '../types/client-contact';

export interface ClientContactDataSource {
  getClientContacts(clientId: string): Promise<ClientContact[]>;
  createClientContact(clientId: string, input: ClientContactInput): Promise<ClientContact>;
  updateClientContact(contactId: string, input: ClientContactInput): Promise<ClientContact>;
  removeClientContact(contactId: string): Promise<void>;
}

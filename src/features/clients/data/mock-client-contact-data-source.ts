import type { ClientContactDataSource } from './client-contact-data-source';
import type { ClientContact } from '../types/client-contact';

const CONTACTS: ClientContact[] = [
  { id: 'contact-nova-primary', clientId: 'client-nova', name: 'Nadia Pratama', email: 'nadia@novasalon.id', phone: '+62 812 8400 111', jobTitle: 'Operations Director', role: 'PRIMARY' },
  { id: 'contact-nova-commercial', clientId: 'client-nova', name: 'Ferry Wijaya', email: 'ferry@novasalon.id', phone: '+62 812 8400 222', jobTitle: 'Finance Manager', role: 'COMMERCIAL' },
  { id: 'contact-nova-technical', clientId: 'client-nova', name: 'Rian Saputra', email: 'rian@novasalon.id', jobTitle: 'IT Lead', role: 'TECHNICAL' },
  { id: 'contact-poseidon-primary', clientId: 'client-poseidon', name: 'Rama Putra', email: 'rama@poseidonfilter.id', role: 'PRIMARY' },
];

export function createMockClientContactDataSource(): ClientContactDataSource {
  const contacts = CONTACTS.map((contact) => ({ ...contact }));
  return {
    async getClientContacts(clientId) { return contacts.filter((contact) => contact.clientId === clientId).map((contact) => ({ ...contact })); },
    async createClientContact(clientId, input) { const contact = { id: `contact-${clientId}-${Date.now()}`, clientId, name: input.name.trim(), email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, jobTitle: input.jobTitle?.trim() || undefined, role: input.role }; contacts.push(contact); return { ...contact }; },
    async updateClientContact(contactId, input) { const contact = contacts.find((candidate) => candidate.id === contactId); if (!contact) throw new Error('Client contact was not found.'); Object.assign(contact, { name: input.name.trim(), email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, jobTitle: input.jobTitle?.trim() || undefined, role: input.role }); return { ...contact }; },
    async removeClientContact(contactId) { const index = contacts.findIndex((contact) => contact.id === contactId); if (index < 0) throw new Error('Client contact was not found.'); contacts.splice(index, 1); },
  };
}

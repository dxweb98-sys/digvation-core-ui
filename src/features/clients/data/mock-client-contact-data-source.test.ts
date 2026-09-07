import { describe, expect, it } from 'vitest';
import { createMockClientContactDataSource } from './mock-client-contact-data-source';

describe('mock client contact data source', () => {
  it('creates, updates, and removes client-owned contacts', async () => {
    const dataSource = createMockClientContactDataSource();
    const created = await dataSource.createClientContact('client-nova', { name: 'Ayu Pratama', role: 'COMMERCIAL', email: 'ayu@nova.example' });
    await expect(dataSource.updateClientContact(created.id, { ...created, name: 'Ayu P.' })).resolves.toMatchObject({ name: 'Ayu P.', clientId: 'client-nova' });
    await expect(dataSource.removeClientContact(created.id)).resolves.toBeUndefined();
    await expect(dataSource.getClientContacts('client-nova')).resolves.not.toContainEqual(expect.objectContaining({ id: created.id }));
  });
});

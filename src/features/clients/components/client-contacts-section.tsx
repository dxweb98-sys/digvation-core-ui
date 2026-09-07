import { DButton, DConfirmDialog, DConnectionError, DDataTable, DDialog, DEmptyState, DInput, DSelect, useToast, type TableAction, type TableColumn } from '@digvation-labs/ui';
import { useState } from 'react';
import { useClientContacts, useCreateClientContact, useRemoveClientContact, useUpdateClientContact } from '../hooks/use-client-contacts';
import type { ClientContact, ClientContactInput, ContactRole } from '../types/client-contact';

const ROLE_OPTIONS = [{ value: 'PRIMARY', label: 'Primary' }, { value: 'COMMERCIAL', label: 'Commercial' }, { value: 'BILLING', label: 'Billing' }, { value: 'TECHNICAL', label: 'Technical' }];
const COLUMNS: TableColumn<ClientContact>[] = [
  { key: 'name', label: 'Contact', render: (contact) => <div className="client-contact-name"><strong>{contact.name}</strong><span>{contact.jobTitle ?? 'No title recorded'}</span></div> },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email', render: (contact) => contact.email ?? 'Not recorded' },
  { key: 'phone', label: 'Phone', render: (contact) => contact.phone ?? 'Not recorded' },
];

function ContactForm({ contact, onSubmit }: { contact?: ClientContact; onSubmit: (input: ClientContactInput) => void }) {
  const [values, setValues] = useState<ClientContactInput>({ name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', jobTitle: contact?.jobTitle ?? '', role: contact?.role ?? 'PRIMARY' });
  return <form id="client-contact-form" className="client-contact-form" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
    <DInput label="Name *" value={values.name} onChange={(name) => setValues((current) => ({ ...current, name }))} />
    <div className="client-form-grid"><DInput label="Email" value={values.email ?? ''} onChange={(email) => setValues((current) => ({ ...current, email }))} /><DInput label="Phone" value={values.phone ?? ''} onChange={(phone) => setValues((current) => ({ ...current, phone }))} /></div>
    <div className="client-form-grid"><DInput label="Job Title" value={values.jobTitle ?? ''} onChange={(jobTitle) => setValues((current) => ({ ...current, jobTitle }))} /><DSelect label="Role *" value={values.role} options={ROLE_OPTIONS} onValueChange={(role) => setValues((current) => ({ ...current, role: role as ContactRole }))} /></div>
  </form>;
}

export function ClientContactsSection({ clientId }: { clientId: string }) {
  const contactsQuery = useClientContacts(clientId);
  const create = useCreateClientContact(clientId);
  const update = useUpdateClientContact();
  const remove = useRemoveClientContact();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ClientContact | null | undefined>(undefined);
  const [removing, setRemoving] = useState<ClientContact | null>(null);
  if (contactsQuery.isError) return <DConnectionError title="Contacts unavailable" message="Client contacts could not be loaded." detail={contactsQuery.error.message} onRetry={() => void contactsQuery.refetch()} />;
  const contacts = contactsQuery.data ?? [];
  const actions: TableAction<ClientContact>[] = [{ label: 'Edit contact', onClick: setEditing }, { label: 'Remove contact', variant: 'danger', onClick: setRemoving }];
  async function submit(input: ClientContactInput) {
    if (!input.name.trim()) return;
    try { if (editing) await update.mutateAsync({ contactId: editing.id, input }); else await create.mutateAsync(input); showToast({ title: editing ? 'Contact updated' : 'Contact added', variant: 'success' }); setEditing(undefined); }
    catch (error) { showToast({ title: 'Contact update failed', description: error instanceof Error ? error.message : 'The contact could not be saved.', variant: 'danger' }); }
  }
  function confirmRemoval() {
    if (!removing) return;
    void remove.mutateAsync(removing.id).then(() => { showToast({ title: 'Contact removed', variant: 'success' }); setRemoving(null); }).catch((error: unknown) => showToast({ title: 'Contact removal failed', description: error instanceof Error ? error.message : 'The contact could not be removed.', variant: 'danger' }));
  }
  return <section className="client-contacts-section"><div className="client-section-heading"><div><h2>Contacts</h2><p>Operational and commercial contacts for this organization.</p></div><DButton onClick={() => setEditing(null)}>Add Contact</DButton></div>
    {contactsQuery.isPending ? null : contacts.length ? <DDataTable columns={COLUMNS} data={contacts} rowKey="id" actions={actions} /> : <DEmptyState title="No contacts recorded" description="Add the first organization contact." />}
    <DDialog open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit contact' : 'Add contact'} footer={<div className="client-dialog-actions"><DButton variant="outline" onClick={() => setEditing(undefined)}>Cancel</DButton><DButton form="client-contact-form" type="submit" loading={create.isPending || update.isPending}>{editing ? 'Save Changes' : 'Add Contact'}</DButton></div>}><ContactForm key={editing?.id ?? 'new'} contact={editing ?? undefined} onSubmit={submit} /></DDialog>
    <DConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove contact" message={`Remove ${removing?.name ?? 'this contact'} from this client?`} confirmLabel="Remove contact" variant="danger" loading={remove.isPending} onConfirm={confirmRemoval} />
  </section>;
}

import { RecordButton } from '../../../shared/ui/record-button';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput, AppSelect } from '../../../shared/ui/form-fields';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { labelFor } from '../../../shared/labels/labels';
import { Plus } from 'lucide-react';
import { AppAction } from '../../../shared/ui/app-action';
import { DConfirmDialog, DConnectionError, DDataTable, DEmptyState, useToast, type TableAction, type TableColumn } from '@digvation/ui';
import { AppDialog } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useClientContacts, useCreateClientContact, useRemoveClientContact, useUpdateClientContact } from '../hooks/use-client-contacts';
import type { ClientContact, ClientContactInput, ContactRole } from '../types/client-contact';

const ROLE_OPTIONS = [{ value: 'PRIMARY', label: 'Primary' }, { value: 'COMMERCIAL', label: 'Commercial' }, { value: 'BILLING', label: 'Billing' }, { value: 'TECHNICAL', label: 'Technical' }];
const COLUMNS: TableColumn<ClientContact>[] = [
  { key: 'name', label: 'Contact', render: (contact) => <div className="client-contact-name"><RecordButton><strong>{contact.name}</strong></RecordButton><span>{valueOrNotSet(contact.jobTitle, 'Job title')}</span></div> },
  { key: 'role', label: 'Role', render: (contact) => labelFor(contact.role) },
  { key: 'email', label: 'Email', render: (contact) => valueOrNotSet(contact.email) },
  { key: 'phone', label: 'Phone', render: (contact) => valueOrNotSet(contact.phone) },
];

function ContactForm({ contact, onSubmit }: { contact?: ClientContact; onSubmit: (input: ClientContactInput) => void }) {
  const [values, setValues] = useState<ClientContactInput>({ name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', jobTitle: contact?.jobTitle ?? '', role: contact?.role ?? 'PRIMARY' });
  const { field, allowSubmit } = useFieldErrors<'name'>('client-contact-form', () => (values.name.trim() ? {} : { name: 'Enter a name.' }));
  return <form id="client-contact-form" className="client-contact-form" onSubmit={(event) => { event.preventDefault(); if (allowSubmit()) onSubmit(values); }}>
    <AppInput {...field('name')} label="Name" placeholder="Rani Putri" value={values.name} onChange={(name) => setValues((current) => ({ ...current, name }))} />
    <div className="client-form-grid"><AppInput label="Email" placeholder="rani@novasalon.id" value={values.email ?? ''} onChange={(email) => setValues((current) => ({ ...current, email }))} /><AppInput label="Phone" placeholder="+62 812 5550 1200" optional value={values.phone ?? ''} onChange={(phone) => setValues((current) => ({ ...current, phone }))} /></div>
    <div className="client-form-grid"><AppInput label="Job title" placeholder="Finance manager" optional value={values.jobTitle ?? ''} onChange={(jobTitle) => setValues((current) => ({ ...current, jobTitle }))} /><AppSelect label="Role" placeholder="Select a role" value={values.role} options={ROLE_OPTIONS} onValueChange={(role) => setValues((current) => ({ ...current, role: role as ContactRole }))} /></div>
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
  const actions: TableAction<ClientContact>[] = [{ label: 'Edit', onClick: setEditing }, { label: 'Remove', variant: 'danger', onClick: setRemoving }];
  async function submit(input: ClientContactInput) {
    if (!input.name.trim()) return;
    try { if (editing) await update.mutateAsync({ contactId: editing.id, input }); else await create.mutateAsync(input); showToast({ title: editing ? 'Contact updated' : 'Contact added', variant: 'success' }); setEditing(undefined); }
    catch (error) { showToast({ title: 'Contact update failed', description: error instanceof Error ? error.message : 'The contact could not be saved.', variant: 'danger' }); }
  }
  function confirmRemoval() {
    if (!removing) return;
    void remove.mutateAsync(removing.id).then(() => { showToast({ title: 'Contact removed', variant: 'success' }); setRemoving(null); }).catch((error: unknown) => showToast({ title: 'Contact removal failed', description: error instanceof Error ? error.message : 'The contact could not be removed.', variant: 'danger' }));
  }
  return <section className="client-contacts-section"><div className="client-section-heading"><div><h2>Contacts</h2></div><AppAction icon={Plus} tone="secondary" onClick={() => setEditing(null)}>Add contact</AppAction></div>
    {contactsQuery.isPending ? null : contacts.length ? <DDataTable columns={COLUMNS} data={contacts} rowKey="id" onRowClick={setEditing} actions={actions} /> : <DEmptyState title="No contacts" description="Add a contact for this client." />}
    <AppDialog kind="form" open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit' : 'Add contact'} footer={<div className="client-dialog-actions"><AppAction tone="secondary" onClick={() => setEditing(undefined)}>Cancel</AppAction><AppAction form="client-contact-form" type="submit" loading={create.isPending || update.isPending}>{editing ? 'Save' : 'Add contact'}</AppAction></div>}><ContactForm key={editing?.id ?? 'new'} contact={editing ?? undefined} onSubmit={submit} /></AppDialog>
    <DConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove" message={`Remove ${removing?.name ?? 'this contact'} from this client?`} confirmLabel="Remove" variant="danger" loading={remove.isPending} onConfirm={confirmRemoval} />
  </section>;
}

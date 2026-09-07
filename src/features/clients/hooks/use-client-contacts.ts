import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CLIENT_CONTACT_QUERY_KEYS } from '../data/client-contact-query-keys';
import { resolveClientContactDataSource } from '../data/resolve-client-contact-data-source';
import type { ClientContactInput } from '../types/client-contact';

const clientContactDataSource = resolveClientContactDataSource();
function invalidate(queryClient: ReturnType<typeof useQueryClient>) { return queryClient.invalidateQueries({ queryKey: CLIENT_CONTACT_QUERY_KEYS.all }); }
export function useClientContacts(clientId: string) { return useQuery({ queryKey: CLIENT_CONTACT_QUERY_KEYS.byClient(clientId), queryFn: () => clientContactDataSource.getClientContacts(clientId), enabled: Boolean(clientId) }); }
export function useCreateClientContact(clientId: string) { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: ClientContactInput) => clientContactDataSource.createClientContact(clientId, input), onSuccess: () => invalidate(queryClient) }); }
export function useUpdateClientContact() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ contactId, input }: { contactId: string; input: ClientContactInput }) => clientContactDataSource.updateClientContact(contactId, input), onSuccess: () => invalidate(queryClient) }); }
export function useRemoveClientContact() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (contactId: string) => clientContactDataSource.removeClientContact(contactId), onSuccess: () => invalidate(queryClient) }); }

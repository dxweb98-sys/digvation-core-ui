/** CORE puts the token in the URL fragment so it never reaches server logs. */
export function invitationToken(hash: string, search: string) {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? new URLSearchParams(search).get('token');
}

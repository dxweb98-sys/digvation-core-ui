/** CORE's password rule: 12 to 128 characters, confirmed. */
export function passwordProblems(password: string, confirm: string) {
  const problems: { password?: string; confirm?: string } = {};
  if (password.length < 12) problems.password = 'Use at least 12 characters.';
  else if (password.length > 128) problems.password = 'Use at most 128 characters.';
  if (!confirm || confirm !== password) problems.confirm = 'The passwords do not match.';
  return problems;
}

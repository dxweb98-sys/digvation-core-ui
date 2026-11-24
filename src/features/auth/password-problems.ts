/** CORE's password rule: 12 to 128 characters, confirmed. */
export function passwordProblems(password: string, confirm: string) {
  const problems: { password?: string; confirm?: string } = {};
  if (password.length < 12) problems.password = 'Minimal 12 karakter.';
  else if (password.length > 128) problems.password = 'Maksimal 128 karakter.';
  if (!confirm || confirm !== password) problems.confirm = 'Kata sandi tidak cocok.';
  return problems;
}

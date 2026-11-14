export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
];

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** CORE checks the content itself; this only catches the obvious mistakes before upload. */
export function proofProblem(file: File | null) {
  if (!file) return 'Choose a file.';
  if (file.size > PROOF_MAX_BYTES) return 'The file is larger than 5 MB.';
  if (file.type && !PROOF_TYPES.includes(file.type)) return 'Use a PDF, JPG or PNG file.';
  return undefined;
}

/** Hands a downloaded file to the browser as a save. */
export function saveFile(file: { blob: Blob; filename?: string }, fallbackName: string) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** File names from document numbers ("INV/2026/11/00001" -> "INV-2026-11-00001.pdf"). */
export function documentFileName(number: string | null | undefined, fallback: string, extension = 'pdf') {
  return `${(number ?? fallback).replace(/[^A-Za-z0-9._-]+/g, '-')}.${extension}`;
}

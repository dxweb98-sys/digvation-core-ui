export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency.trim().toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function minorToMajorValue(amountMinor: number) {
  return String(amountMinor / 100);
}

export function majorToMinorValue(value: string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

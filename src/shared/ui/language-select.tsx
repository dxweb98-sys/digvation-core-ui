import { DSelect } from '@digvation/ui';
import { DISPLAY_LOCALES, setDisplayLocale, useDisplayLocale, type DisplayLocale } from '../format/locale';

/** Switches the format language (dates and amounts); the copy stays as it is. */
export function LanguageSelect({
  label = 'Format tanggal & angka',
  hint,
  compact = false,
}: {
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  const locale = useDisplayLocale();
  return (
    <DSelect
      label={label}
      hint={hint}
      size={compact ? 'sm' : undefined}
      options={DISPLAY_LOCALES}
      value={locale}
      onValueChange={(value) => {
        if (value === 'id-ID' || value === 'en-US') setDisplayLocale(value as DisplayLocale);
      }}
    />
  );
}

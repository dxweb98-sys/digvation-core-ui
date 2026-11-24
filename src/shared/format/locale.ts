import { useSyncExternalStore } from 'react';

/**
 * The display language of formats (spec D30). It changes how money and dates
 * are written, not the copy: the UI copy stays Indonesian.
 */
export type DisplayLocale = 'id-ID' | 'en-US';

export const DISPLAY_LOCALES: readonly { value: DisplayLocale; label: string }[] = [
  { value: 'id-ID', label: 'Indonesia' },
  { value: 'en-US', label: 'English (US)' },
];

export const DEFAULT_LOCALE: DisplayLocale = 'id-ID';
const STORAGE_KEY = 'core-ui.display-locale';

function isDisplayLocale(value: unknown): value is DisplayLocale {
  return value === 'id-ID' || value === 'en-US';
}

function readStored(): DisplayLocale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isDisplayLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

let current: DisplayLocale = readStored();
const listeners = new Set<() => void>();

export function getDisplayLocale(): DisplayLocale {
  return current;
}

/** Switches the language in memory and, when the browser allows it, in storage. */
export function setDisplayLocale(locale: DisplayLocale) {
  current = locale;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable (private mode, blocked): the in-memory choice still applies.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDisplayLocale(): DisplayLocale {
  return useSyncExternalStore(subscribe, getDisplayLocale, getDisplayLocale);
}

/** Test hook: forgets the in-memory choice and reads storage again. */
export function resetDisplayLocaleForTests() {
  current = readStored();
}

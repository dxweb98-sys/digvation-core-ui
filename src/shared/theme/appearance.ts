import type { ThemeTokens } from '@digvation/ui';
import { useSyncExternalStore } from 'react';

/** The appearance preference (docs/design/00-foundation.md, "Mode dan bahasa"). */
export type Appearance = 'dark' | 'light' | 'system';
export type ResolvedMode = 'dark' | 'light';

export const DEFAULT_APPEARANCE: Appearance = 'dark';
const STORAGE_KEY = 'core-ui.appearance';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isAppearance(value: unknown): value is Appearance {
  return value === 'dark' || value === 'light' || value === 'system';
}

function readStored(): Appearance {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isAppearance(stored) ? stored : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

let current: Appearance = readStored();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function getAppearance(): Appearance {
  return current;
}

/** Switches the appearance in memory and, when the browser allows it, in storage. */
export function setAppearance(appearance: Appearance) {
  current = appearance;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, appearance);
  } catch {
    // Storage unavailable (private mode, blocked): the in-memory choice still applies.
  }
  notify();
}

function systemPrefersDark() {
  return globalThis.matchMedia?.(DARK_QUERY).matches ?? true;
}

export function resolveMode(appearance: Appearance = current): ResolvedMode {
  if (appearance !== 'system') return appearance;
  return systemPrefersDark() ? 'dark' : 'light';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = globalThis.matchMedia?.(DARK_QUERY);
  media?.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', listener);
  };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getAppearance, getAppearance);
}

/** The mode to render: the preference, with `system` following the OS and its changes. */
export function useResolvedMode(): ResolvedMode {
  const read = () => resolveMode();
  return useSyncExternalStore(subscribe, read, read);
}

/** Test hook: forgets the in-memory choice and reads storage again. */
export function resetAppearanceForTests() {
  current = readStored();
}

const FONT_SANS = "'Inter', ui-sans-serif, system-ui, sans-serif";

/** Token table of 00-foundation.md. `brand` equals `text`: the app has no accent color. */
export const THEME_TOKENS: Record<ResolvedMode, ThemeTokens> = {
  dark: {
    background: '#0a0a0a',
    surface: '#111111',
    surfaceMuted: '#1a1a1a',
    border: '#262626',
    text: '#ededed',
    textMuted: '#a1a1a1',
    brand: '#ededed',
    brandHover: '#ffffff',
    brandActive: '#ffffff',
    brandForeground: '#0a0a0a',
    secondary: '#1a1a1a',
    secondaryHover: '#232323',
    secondaryForeground: '#ededed',
    focus: '#ededed',
    success: '#45a557',
    warning: '#f5a524',
    danger: '#e5484d',
    info: '#52a8ff',
    shadowSm: '0 1px 2px rgb(0 0 0 / 40%)',
    shadowLg: '0 20px 60px rgb(0 0 0 / 55%)',
    fontSans: FONT_SANS,
  },
  light: {
    background: '#faf9f7',
    surface: '#ffffff',
    surfaceMuted: '#f1eee9',
    border: '#e5e0d8',
    text: '#1c1917',
    textMuted: '#6f6862',
    brand: '#1c1917',
    brandHover: '#000000',
    brandActive: '#000000',
    brandForeground: '#faf9f7',
    secondary: '#f1eee9',
    secondaryHover: '#e9e5de',
    secondaryForeground: '#1c1917',
    focus: '#1c1917',
    success: '#2f7d45',
    warning: '#a8650b',
    danger: '#c0392b',
    info: '#1d6fa5',
    shadowSm: '0 1px 2px rgb(28 25 23 / 6%)',
    shadowLg: '0 18px 50px rgb(28 25 23 / 16%)',
    fontSans: FONT_SANS,
  },
};

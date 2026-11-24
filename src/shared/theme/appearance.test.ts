import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE, getAppearance, resetAppearanceForTests, resolveMode, setAppearance } from './appearance';

function mockSystemDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  resetAppearanceForTests();
});

describe('appearance preference', () => {
  it('system follows prefers-color-scheme', () => {
    mockSystemDark(false);
    expect(resolveMode('system')).toBe('light');
    mockSystemDark(true);
    expect(resolveMode('system')).toBe('dark');
    expect(resolveMode('light')).toBe('light');
  });

  it('persists the choice', () => {
    setAppearance('light');
    resetAppearanceForTests();
    expect(getAppearance()).toBe('light');
  });

  it('falls back to memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    resetAppearanceForTests();
    expect(getAppearance()).toBe(DEFAULT_APPEARANCE);
    setAppearance('system');
    expect(getAppearance()).toBe('system');
  });
});

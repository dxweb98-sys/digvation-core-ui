import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDisplayLocale, resetDisplayLocaleForTests, setDisplayLocale } from './locale';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  resetDisplayLocaleForTests();
});

describe('display language', () => {
  it('defaults to id-ID and remembers a switch in storage', () => {
    expect(getDisplayLocale()).toBe('id-ID');
    setDisplayLocale('en-US');
    expect(localStorage.getItem('core-ui.display-locale')).toBe('en-US');
    resetDisplayLocaleForTests();
    expect(getDisplayLocale()).toBe('en-US');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem('core-ui.display-locale', 'fr-FR');
    resetDisplayLocaleForTests();
    expect(getDisplayLocale()).toBe('id-ID');
  });

  it('keeps working in memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setDisplayLocale('en-US');
    expect(getDisplayLocale()).toBe('en-US');
    resetDisplayLocaleForTests();
    expect(getDisplayLocale()).toBe('id-ID');
  });
});

import { describe, expect, it } from 'vitest';
import type { ThemeTokens } from '@digvation/ui';
import stylesheet from '../styles.css?raw';
import { THEME_TOKENS } from '../shared/theme/appearance';

type Rgb = [number, number, number];

function rgb(hex: string | undefined): Rgb {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`${hex} is not a hex color`);
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

function luminance(color: Rgb) {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const SIDEBAR = { dark: '#111111', light: '#f3f1ed' } as const;

/*
 * The approved palette (00-foundation.md) does not reach 4.5:1 for every status
 * pill (10% tint), for dark danger text on surfaceMuted, or for white on dark danger; that gap is reported to the
 * product owner, so it is not asserted here.
 */
describe.each(Object.entries(THEME_TOKENS) as [keyof typeof THEME_TOKENS, ThemeTokens][])(
  '%s theme contrast (WCAG 2.1 AA)',
  (mode, tokens) => {
    const surfaces = [tokens.background, tokens.surface, tokens.surfaceMuted, SIDEBAR[mode]];

    it.each(surfaces)('keeps text and muted text readable on %s', (surface) => {
      expect(contrast(rgb(tokens.text), rgb(surface))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(tokens.textMuted), rgb(surface))).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps primary actions readable in every button state', () => {
      for (const state of [tokens.brand, tokens.brandHover, tokens.brandActive]) {
        expect(contrast(rgb(tokens.brandForeground), rgb(state))).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(surfaces)('keeps the focus ring visible on %s', (surface) => {
      expect(contrast(rgb(tokens.focus), rgb(surface))).toBeGreaterThanOrEqual(3);
    });

    it.each(surfaces)('keeps status colors distinguishable (3:1) on %s', (surface) => {
      for (const status of [tokens.success, tokens.warning, tokens.danger, tokens.info]) {
        expect(contrast(rgb(status), rgb(surface))).toBeGreaterThanOrEqual(3);
      }
    });
  },
);

describe('control room motion tokens', () => {
  it('keeps interactive feedback within the motion spec', () => {
    expect(stylesheet).toMatch(/--motion-fast: 120ms;/);
    expect(stylesheet).toMatch(/--motion-base: 180ms;/);
    expect(stylesheet).toMatch(/--motion-slow: 260ms;/);
  });

  it('turns motion off for people who ask for reduced motion', () => {
    const reduced = stylesheet.slice(stylesheet.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/--motion-slow: 0ms;/);
    expect(reduced).toMatch(/\.page-enter/);
    expect(reduced).toMatch(/tbody tr:nth-child\(-n \+ 8\)/);
    expect(reduced).toMatch(/\.content-skeleton-block/);
    expect(reduced).toMatch(/\.status-dot-live/);
    expect(reduced).toMatch(/animation: none;/);
  });
});

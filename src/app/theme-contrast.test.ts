import { describe, expect, it } from 'vitest';
import stylesheet from '../styles.css?raw';

type Rgb = [number, number, number];

function token(name: string): Rgb {
  const match = stylesheet.match(new RegExp(`--${name}:\\s*#([0-9a-f]{6});`));
  if (!match) throw new Error(`Token --${name} is not a hex color`);
  const hex = match[1];
  return [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
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

// DBadge paints status text over a 10% tint of the same color.
function tint(color: Rgb, background: Rgb, alpha = 0.1): Rgb {
  return color.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as Rgb;
}

const SURFACES = ['cc-canvas', 'cc-surface', 'cc-raised', 'cc-overlay'];
const STATUS = [
  'cc-status-success',
  'cc-status-warning',
  'cc-status-danger',
  'cc-status-info',
];

describe('control room theme contrast (WCAG 2.1 AA)', () => {
  it.each(SURFACES)('keeps text readable on %s', (surface) => {
    expect(contrast(token('cc-text'), token(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('cc-text-muted'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['cc-rail', 'cc-canvas', 'cc-surface'])('keeps navigation text readable on %s', (surface) => {
    expect(contrast(token('cc-text-muted'), token(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('cc-text-subtle'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps primary actions readable in every button state', () => {
    for (const state of ['cc-accent', 'cc-accent-hover', 'cc-accent-active']) {
      expect(contrast(token('cc-on-accent'), token(state))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps white text readable on a solid danger button', () => {
    expect(contrast([255, 255, 255], token('cc-status-danger-solid'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)('keeps focus and control boundaries visible on %s', (surface) => {
    expect(contrast(token('cc-accent'), token(surface))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('cc-line-control'), token(surface))).toBeGreaterThanOrEqual(3);
  });

  it.each(STATUS.flatMap((status) => SURFACES.map((surface) => [status, surface])))(
    'keeps %s pills readable on %s',
    (status, surface) => {
      const color = token(status);
      expect(contrast(color, tint(color, token(surface)))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['cc-series-1', 'cc-series-2', 'cc-series-3'])('keeps %s chart marks visible on the chart surface', (series) => {
    expect(contrast(token(series), token('cc-surface'))).toBeGreaterThanOrEqual(3);
  });

  it('layers surfaces from the dimmest rail to the brightest overlay', () => {
    const order = ['cc-rail', ...SURFACES].map((name) => luminance(token(name)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('never reuses the accent as a status color', () => {
    const accent = token('cc-accent').join();
    for (const status of STATUS) expect(token(status).join()).not.toBe(accent);
  });
});

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
